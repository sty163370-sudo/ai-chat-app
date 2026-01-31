import { createContext, useState, useEffect, useRef } from "react";
import { runChatStream } from "../config/openai";
import { loadConversationsFromStorage,
    saveConversationsToStorage,
    loadCurrentConversationId,
    saveCurrentConversationId } from "../util/storage";
export const Context = createContext();




const ContextProvider = (props) => {
    // ========== 使用 Map 存储多个对话会话 ==========
    // key: conversationId (字符串)
    // value: { messages: [], title: string, createdAt: number }
    const [conversations, setConversations] = useState(()=>{
        return loadConversationsFromStorage();
    });
    
    // 当前对话 ID
    const [currentConversationId, setCurrentConversationId] = useState(()=>{
        return loadCurrentConversationId();
    });
    
    // ========== UI 状态 ==========
    const [input, setInput] = useState("");
    const [recentPrompt, setRecentPrompt] = useState('');
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resultData, setResultData] = useState(''); // 保留用于向后兼容
    const [streamingMessage, setStreamingMessage] = useState(''); // 流式消息内容
    const [error, setError] = useState(null);
    
    // 语音识别相关
    const [voiceSearch, setVoiceSearch] = useState(false);
    const [recognition, setRecognition] = useState(null);
    const [recordingAnimation, setRecordingAnimation] = useState(false);

    // 用于取消流式请求
    const abortControllerRef = useRef(null);

    // ========== 工具函数 ==========
    
    // 生成新的对话 ID
    const generateConversationId = () => {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    };

    // 获取当前对话的消息历史
    const getCurrentMessages = () => {
        if (!currentConversationId) return [];
        const conv = conversations.get(currentConversationId);
        return conv ? conv.messages : [];
    };

    // 更新对话消息
    const updateConversation = (conversationId, messages, title = null) => {
        setConversations(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(conversationId) || { 
                messages: [], 
                title: '新对话',
                createdAt: Date.now()
            };
            
            newMap.set(conversationId, {
                messages: messages,
                title: title || existing.title || '新对话',
                createdAt: existing.createdAt || Date.now(),
            });
            saveConversationsToStorage(newMap);
            return newMap;
        });
    };

    // ========== 对话管理函数 ==========
    
    // 新建对话
    const newChat = () => {
        const newId = generateConversationId();
        setCurrentConversationId(newId);
        saveCurrentConversationToStorage(newId);
        setConversations(prev => {
            const newMap = new Map(prev);
            newMap.set(newId, { 
                messages: [], 
                title: '新对话',
                createdAt: Date.now()
            });
            saveConversationsToStorage(newMap);
            return newMap;
        });
        setShowResult(false);
        setResultData('');
        setStreamingMessage(''); // 清空流式消息
        setInput('');
        setError(null);
        setRecentPrompt('');
    };

    // 切换到指定对话
    const switchConversation = (conversationId) => {
        setCurrentConversationId(conversationId);
        saveCurrentConversationToStorage(conversationId);
        const conv = conversations.get(conversationId);
        
        if (conv && conv.messages.length > 0) {
            // 显示最后一条 AI 回复（向后兼容）
            const lastMessage = conv.messages[conv.messages.length - 1];
            if (lastMessage.role === 'assistant') {
                setResultData(lastMessage.content);
                setShowResult(true);
            }
            // 显示最后一条用户消息作为 recentPrompt
            const userMessages = conv.messages.filter(m => m.role === 'user');
            if (userMessages.length > 0) {
                setRecentPrompt(userMessages[userMessages.length - 1].content);
            }
        } else {
            setShowResult(false);
            setResultData('');
            setRecentPrompt('');
        }
        // 切换对话时清空流式消息
        setStreamingMessage('');
    };

    // 删除对话
    const deleteConversation = (conversationId) => {
        setConversations(prev => {
            const newMap = new Map(prev);
            newMap.delete(conversationId);
            saveConversationsToStorage(newMap);
            return newMap;
        });
        
        // 如果删除的是当前对话，切换到其他对话或新建
        if (conversationId === currentConversationId) {
            const remaining = Array.from(conversations.keys()).filter(id => id !== conversationId);
            if (remaining.length > 0) {
                switchConversation(remaining[0]);
            } else {
                newChat();
            }
        }
    };

    // ========== 消息发送函数 ==========
    
    // 流式发送消息
    const onSent = async (prompt) => {
        if (loading) return;
        
        // 如果没有当前对话，创建新对话
        if (!currentConversationId) {
            newChat();
            // 等待状态更新
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        const conversationId = currentConversationId;
        const currentMessages = getCurrentMessages();
        
        // 用户输入的消息
        const userMessage = {
            role: 'user',
            content: prompt || input,
        };
        
        // 更新对话，添加用户消息
        const updatedMessages = [...currentMessages, userMessage];
        updateConversation(conversationId, updatedMessages);

        // 设置 UI 状态
        setRecentPrompt(userMessage.content);
        setLoading(true);
        setShowResult(true);
        setResultData("");
        setStreamingMessage(""); // 清空流式消息
        setError(null);
        setInput("");

        // 创建 AbortController 用于取消请求
        abortControllerRef.current = new AbortController();

        try {
            let accumulatedContent = '';
            let chunkCount = 0; // 用于调试
            let rafId = null;
            let pendingContent = '';
            // 调用流式 API
            await runChatStream(
                prompt || input,
                conversationId,
                updatedMessages,
                // 回调函数：每次收到新内容时调用
                (chunk, fullContent) => {
                    chunkCount++;
                    pendingContent =fullContent;
                    accumulatedContent = fullContent; 
                    
                    // ⭐ 开发环境调试日志（前5个和每10个）
                    if (process.env.NODE_ENV === 'development' && (chunkCount <= 5 || chunkCount % 10 === 0)) {
                        console.log(`[流式响应] 第 ${chunkCount} 个数据块:`, chunk.substring(0, 30) + (chunk.length > 30 ? '...' : ''));
                    }
                    if(!rafId)
                    {
                        rafId = requestAnimationFrame(() => {
                            setStreamingMessage(formatResponse(pendingContent));
                            setResultData(formatResponse(pendingContent));
                            pendingContent = '';
                            rafId = null;
                        });
                    }
                    
                },
                abortControllerRef.current.signal
            );
            if(rafId)
            {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            



            // 开发环境日志
            if (process.env.NODE_ENV === 'development') {
                console.log(`[流式响应完成] 共收到 ${chunkCount} 个数据块，总长度: ${accumulatedContent.length} 字符`);
            }

            // 流式响应完成，添加 AI 回复到对话历史
            const assistantMessage = {
                role: 'assistant',
                content: accumulatedContent,
            };
            
            const finalMessages = [...updatedMessages, assistantMessage];
            updateConversation(conversationId, finalMessages);
            
            // 清空流式消息状态
            setStreamingMessage("");
            
            // 如果对话标题还是默认的，使用第一条用户消息作为标题
            const conv = conversations.get(conversationId);
            if (conv && conv.title === '新对话' && updatedMessages.length === 1) {
                const title = (prompt || input).slice(0, 20) + (prompt || input).length > 20 ? '...' : '';
                updateConversation(conversationId, finalMessages, title);
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('请求已取消');
                setStreamingMessage(""); // 取消时清空流式消息
                return;
            }
            
            const errorMessage = error.message || "发生未知错误，请稍后重试。";
            setError(errorMessage);
            setResultData("");
            setStreamingMessage(""); // 错误时清空流式消息
            console.error("发送消息时出错:", error);
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    // 停止生成
    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setLoading(false);
            setStreamingMessage(""); // 停止时清空流式消息
        }
    };

    // 格式化响应（处理 Markdown）
    const formatResponse = (text) => {
        // 处理粗体 **text**
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        // 处理换行
        formatted = formatted.replace(/\n/g, '<br>');
        return formatted;
    };

    // ========== 语音识别 ==========
    
    useEffect(() => {
        const recognition = new window.webkitSpeechRecognition();
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setVoiceSearch(false);
            setInput(transcript);
            onSent(transcript);
            setInput("");
            setRecordingAnimation(false); 
        };

        recognition.onend = () => {
            setVoiceSearch(false);
            setRecordingAnimation(false);
        };

        setRecognition(recognition);
    }, []);

    const openVoiceSearch = () => {
        if (!voiceSearch && recognition) {
            recognition.start();
            setVoiceSearch(true);
            setRecordingAnimation(true);
        }
    };

    // ========== 其他函数 ==========
    
    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
          onSent();
        }
      };

    // 获取对话列表（用于侧边栏显示）
    const getConversationList = () => {
        return Array.from(conversations.entries())
            .map(([id, conv]) => ({
                id,
                title: conv.title,
                messages: conv.messages,
                createdAt: conv.createdAt,
            }))
            .sort((a, b) => b.createdAt - a.createdAt); // 按时间倒序
    };

    // ========== Context 值 ==========
    
    const contextValue = {
        // 对话管理
        conversations,
        currentConversationId,
        getConversationList,
        getCurrentMessages, // 导出消息列表函数
        newChat,
        switchConversation,
        deleteConversation,
        
        // 消息发送
        onSent,
        stopGeneration,
        
        // UI 状态
        input,
        setInput,
        recentPrompt,
        showResult,
        loading,
        resultData,
        streamingMessage, // 导出流式消息状态
        error,
        setError,
        
        // 其他
        handleKeyPress,
        voiceSearch,
        openVoiceSearch,
        recordingAnimation,
        setRecordingAnimation,
    };

    return (
        <Context.Provider value={contextValue}>
            {props.children}
        </Context.Provider>
    );
};

export default ContextProvider;