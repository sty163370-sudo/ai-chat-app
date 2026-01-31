# 设置指南

## 第一步：创建后端环境变量文件

在 `server/` 目录下创建 `.env` 文件：

**Windows (PowerShell):**
```powershell
cd server
@"
DEEPSEEK_API_KEY=your-deepseek-api-key-here
MODEL_NAME=deepseek-chat
PORT=3001
"@ | Out-File -FilePath .env -Encoding utf8
```

**或者手动创建：**
1. 在 `server/` 目录下创建新文件 `.env`
2. 复制以下内容：

```env
DEEPSEEK_API_KEY=your-deepseek-api-key-here
MODEL_NAME=deepseek-chat
PORT=3001
```

⚠️ **重要：** 请先吊销已暴露的 API KEY，然后生成新的 KEY 替换上面的值！

## 第二步：安装后端依赖

```bash
cd server
npm install
```

## 第三步：启动后端服务器

```bash
npm run dev
```

后端将在 `http://localhost:3001` 启动。

## 第四步：安装前端依赖（如果还没安装）

在项目根目录：

```bash
npm install
```

## 第五步：启动前端应用

在项目根目录：

```bash
npm run dev
```

前端将在 `http://localhost:5173` 启动。

## 验证设置

1. 打开浏览器访问 `http://localhost:3001/health`，应该看到：
   ```json
   {"status":"ok","message":"Server is running"}
   ```

2. 打开前端应用 `http://localhost:5173`，尝试发送一条消息。

## 故障排除

### 后端无法启动

- 检查 `server/.env` 文件是否存在
- 确认 API KEY 格式正确
- 查看控制台错误信息

### 前端无法连接后端

- 确认后端服务器正在运行
- 检查浏览器控制台的错误信息
- 确认后端地址是 `http://localhost:3001`

### API 错误

- 检查 API KEY 是否正确
- 确认 API KEY 有足够的配额
- 查看后端服务器日志
