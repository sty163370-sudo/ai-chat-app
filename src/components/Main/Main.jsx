import React, { useContext, useMemo, useRef, useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import "./Main.css";
import { assets } from "../../assets/assets";
import { Context } from "../../context/Context";
import MessageItem from "./MessageItem";

const Main = () => {
  const {
    onSent,
    getCurrentMessages,
    loading,
    streamingMessage,
    error,
    setError,
    stopGeneration,
    setInput,
    input,
    handleKeyPress,
    openVoiceSearch,
    voiceSearch,
    recordingAnimation
  } = useContext(Context);

  const virtuosoRef = useRef(null);
  
  // 获取当前对话的消息列表
  const messages = getCurrentMessages();
  
  // 构建显示的消息列表（包含流式消息）
  const displayMessages = useMemo(() => {
    const list = messages.map((msg, index) => ({
      ...msg,
      id: msg.id || `msg-${index}`
    }));
    // 如果有流式消息，添加临时消息项
    if (loading && streamingMessage) {
      list.push({
        role: 'assistant',
        content: streamingMessage,
        id: 'streaming-temp'
      });
    }
    return list;
  }, [messages, loading, streamingMessage]);

  // 自动滚动到底部（当有新消息或流式更新时）
  useEffect(() => {
    if (virtuosoRef.current && displayMessages.length > 0) {
      // 使用 requestAnimationFrame 确保 DOM 更新后再滚动
      requestAnimationFrame(() => {
        virtuosoRef.current?.scrollToIndex({
          index: displayMessages.length - 1,
          behavior: 'smooth',
          align: 'end'
        });
      });
    }
  }, [displayMessages.length, streamingMessage]);

  // 计算虚拟列表高度（响应式）
  const [listHeight, setListHeight] = useState(window.innerHeight - 200);
  
  useEffect(() => {
    const updateHeight = () => {
      setListHeight(window.innerHeight - 200);
    };
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <div className="main">
      <div className="nav">
        <p>yuanAI</p>
        <img src={assets.user_icon} alt="" />
      </div>
      <div className="main-container">
        {displayMessages.length === 0 && !loading ? (
          <>
            <div className="greet">
              <p>
                <span>hello, yuan</span>
              </p>
              <p>How can I help you?</p>
            </div>
            <div className="cards">
              <div className="card" onClick={() => onSent("建议一些即将自驾游时可以去的美丽景点")}>
                <p>建议一些即将自驾游时可以去的美丽景点</p>
                <img src={assets.compass_icon} alt="" />
              </div>
              <div className="card" onClick={() => onSent("简要总结一下'城市规划'这个概念")}>
                <p>简要总结一下"城市规划"这个概念</p>
                <img src={assets.bulb_icon} alt="" />
              </div>
              <div className="card" onClick={() => onSent("为我们的团队拓展活动集思广益")}>
                <p>为我们的团队拓展活动集思广益</p>
                <img src={assets.message_icon} alt="" />
              </div>
              <div className="card" onClick={() => onSent("提升以下代码的可读性")}>
                <p>提升以下代码的可读性</p>
                <img src={assets.code_icon} alt="" />
              </div>
            </div>
          </>
        ) : (
          <div className="message-list-container">
            {error ? (
              <div className="error-message" style={{
                color: '#ff4444',
                padding: '20px',
                backgroundColor: '#ffe6e6',
                borderRadius: '8px',
                margin: '20px',
                textAlign: 'center'
              }}>
                <p><strong>错误:</strong> {error}</p>
                <button 
                  onClick={() => {
                    setError(null);
                    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
                    if (lastUserMessage) {
                      onSent(lastUserMessage.content);
                    }
                  }}
                  style={{
                    marginTop: '10px',
                    padding: '8px 16px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  重试
                </button>
              </div>
            ) : null}
            <Virtuoso
              ref={virtuosoRef}
              style={{ height: `${listHeight}px`, width: '100%' }}
              data={displayMessages}
              itemContent={(index, message) => {
                const isStreaming = loading && index === displayMessages.length - 1 && message.role === 'assistant' && message.id === 'streaming-temp';
                return (
                  <div style={{ padding: '0 10px' }}>
                    <MessageItem
                      key={message.id || `msg-${index}`}
                      message={message}
                      isStreaming={isStreaming}
                    />
                  </div>
                );
              }}
              followOutput="auto"
              initialTopMostItemIndex={displayMessages.length > 0 ? Math.max(0, displayMessages.length - 1) : 0}
            />
            {loading && (
              <div className="loading-controls" style={{
                position: 'absolute',
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div className="loader">
                  <hr />
                  <hr />
                  <hr />
                </div>
                <button 
                  onClick={stopGeneration}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  停止生成
                </button>
              </div>
            )}
          </div>
        )}

        <div className="main-bottom">
          <div className="search-box">
            <input
              onChange={(e) => setInput(e.target.value)}
              value={input}
              type="text"
              onKeyDown={handleKeyPress}
              placeholder="在这里输入提示"
              disabled={loading} // 加载时禁用输入
            />
            <div>
              <img src={assets.gallery_icon} alt="" />
              <img
                src={assets.mic_icon}
                alt="麦克风图标"
                onClick={openVoiceSearch}
                className={`mic-icon ${voiceSearch ? "active" : ""} ${
                  recordingAnimation ? "recording" : ""
                }`}
                style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
              />
              {input && !loading ? (
                <img onClick={() => onSent()} src={assets.send_icon} alt="" />
              ) : null}
            </div>
          </div>
          <p className="bottom-info">
            yuanAI 可能会显示不准确的信息，请仔细检查其回复。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Main;