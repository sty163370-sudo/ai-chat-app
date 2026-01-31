import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 加载环境变量（从 .env 文件读取 API KEY）
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ========== 中间件配置 ==========
app.use(cors()); // 允许跨域请求（前端可以访问）
app.use(express.json()); // 解析 JSON 请求体

// ========== 健康检查端点 ==========
// 用于检查服务器是否正常运行
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// ========== 流式聊天 API ==========
app.post('/api/chat', async (req, res) => {
  try {
    // 1. 从请求中获取数据
    const { prompt, conversationId, messages } = req.body;
    
    // 2. 验证输入
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: '提示词不能为空' });
    }

    // 3. 检查 API KEY 是否配置
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY 未配置');
      return res.status(500).json({ error: '服务器配置错误，请联系管理员' });
    }
    
    // 4. 构建消息历史（支持多轮对话）
    const messageHistory = messages || [];
    const allMessages = [
      ...messageHistory,
      { 
        role: 'user', 
        content: prompt.trim() 
      }
    ];

    // 5. 调用 DeepSeek API（启用流式响应）
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.MODEL_NAME || 'deepseek-chat',
        messages: allMessages, // 包含历史对话
        temperature: 0.9,
        max_tokens: 2048,
        stream: true, // ⭐ 关键：启用流式响应
      }),
    });

    // 6. 处理 API 错误
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 429) {
        return res.status(429).json({ 
          error: '请求过于频繁，请稍后再试。如果问题持续，请检查您的 API 配额。' 
        });
      } else if (response.status === 401) {
        return res.status(401).json({ error: 'API 密钥无效，请检查配置。' });
      } else if (response.status === 500) {
        return res.status(500).json({ error: 'DeepSeek 服务器错误，请稍后重试。' });
      } else {
        return res.status(response.status).json({ 
          error: errorData.error?.message || `HTTP 错误! 状态码: ${response.status}` 
        });
      }
    }

    // 7. 设置流式响应头（重要！）
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); // 允许跨域

    // 8. 创建流式读取器
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      // 9. 循环读取流式数据
      while (true) {
        const { done, value } = await reader.read();
        
        // 如果流结束，发送结束标记
        if (done) {
          res.write('data: [DONE]\n\n');
          res.end();
          break;
        }

        // 10. 解码数据块
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        // 11. 处理每一行数据
        for (const line of lines) {
          // 只处理以 "data: " 开头的行
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim(); // 去掉 "data: " 前缀
            
            // 如果收到结束标记
            if (data === '[DONE]') {
              res.write('data: [DONE]\n\n');
              res.end();
              return;
            }

            // 12. 解析 JSON 并提取内容
            try {
              const json = JSON.parse(data);
              
              // ⭐ 关键：流式响应中，内容在 delta.content 中，不是 message.content
              const content = json.choices[0]?.delta?.content || '';
              
              // 如果有内容，发送给前端
              if (content) {
                // ⭐ 开发环境调试日志
                if (process.env.NODE_ENV !== 'production') {
                  console.log('📤 发送内容块:', content.substring(0, 30) + (content.length > 30 ? '...' : ''));
                }
                
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
                
                // ⭐ 确保立即刷新（某些情况下可能需要）
                if (typeof res.flush === 'function') {
                  res.flush();
                }
              }
            } catch (parseError) {
              // 只在开发环境显示详细错误
              if (process.env.NODE_ENV !== 'production') {
                console.error('解析 JSON 错误:', parseError, '原始数据:', data.substring(0, 100));
              }
            }
          }
        }
      }
    } catch (streamError) {
      // 13. 处理流读取错误
      console.error('流读取错误:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ error: '流式读取失败' });
      } else {
        res.write('data: [ERROR]\n\n');
        res.end();
      }
    }
  } catch (error) {
    // 14. 处理其他错误
    console.error('服务器错误:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || '服务器内部错误，请稍后重试' 
      });
    }
  }
});

// ========== 启动服务器 ==========
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📝 健康检查: http://localhost:${PORT}/health`);
  console.log(`💬 聊天 API: http://localhost:${PORT}/api/chat`);
});