# Yuan-Chat 后端服务器

这是 Yuan-Chat AI 应用的后端服务器，负责安全地处理 API 调用。

## 功能

- 🔒 安全存储 API KEY（不在前端暴露）
- 🚀 代理 DeepSeek API 请求
- ⚡ 错误处理和重试机制
- 🌐 CORS 支持

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的 DeepSeek API KEY：

```env
DEEPSEEK_API_KEY=your-actual-api-key-here
MODEL_NAME=deepseek-chat
PORT=3001
```

### 3. 启动服务器

开发模式（自动重启）：

```bash
npm run dev
```

生产模式：

```bash
npm start
```

服务器将在 `http://localhost:3001` 启动。

## API 端点

### POST /api/chat

发送聊天请求到 AI。

**请求体：**
```json
{
  "prompt": "你好，请介绍一下自己"
}
```

**响应：**
```json
{
  "result": "你好！我是 DeepSeek..."
}
```

### GET /health

健康检查端点。

**响应：**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## 安全注意事项

⚠️ **重要：**

1. **永远不要**将 `.env` 文件提交到 Git
2. **立即吊销**任何暴露的 API KEY
3. 定期轮换 API KEY
4. 在生产环境中使用 HTTPS

## 故障排除

### 端口被占用

如果 3001 端口被占用，可以修改 `.env` 中的 `PORT` 值。

### API KEY 错误

确保 `.env` 文件中的 `DEEPSEEK_API_KEY` 正确配置。

### CORS 错误

确保前端请求的 URL 与后端服务器地址匹配。
