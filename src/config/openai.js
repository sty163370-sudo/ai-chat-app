// 后端 API 配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// ========== 流式聊天函数 ==========
export async function runChatStream(
  prompt,
  conversationId,
  messages,
  onChunk,
  abortSignal
) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, conversationId, messages }),
    signal: abortSignal,
  });

  if (!response.ok || !response.body) {
    throw new Error('流式请求失败');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        if (!event.startsWith('data:')) continue;

        const data = event.replace('data:', '').trim();

        if (data === '[DONE]') {
          return fullContent;
        }

        const json = JSON.parse(data);
        const content = json.content;

        if (content) {
          fullContent += content;
          onChunk(content, fullContent);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullContent;
}


// ========== 保留原有的非流式函数（向后兼容） ==========
async function runChat(prompt, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : Math.pow(2, attempt) * 1000;
          
          if (attempt < retries - 1) {
            console.log(`速率限制，等待 ${waitTime/1000} 秒后重试...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          } else {
            throw new Error(errorData.error || '请求过于频繁，请稍后再试。');
          }
        } else if (response.status === 401) {
          throw new Error(errorData.error || 'API 密钥无效，请检查配置。');
        } else if (response.status === 500) {
          throw new Error(errorData.error || '服务器错误，请稍后重试。');
        } else {
          throw new Error(errorData.error || `HTTP 错误! 状态码: ${response.status}`);
        }
      }

      const data = await response.json();
      const result = data.result;
      
      if (!result) {
        throw new Error('服务器返回数据格式错误');
      }
      
      console.log('AI 回复:', result);
      return result;
    } catch (error) {
      if (attempt === retries - 1) {
        console.error('API 错误:', error);
        throw error;
      }
      if (error.message && !error.message.includes('HTTP')) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw error;
    }
  }
}

export default runChat;