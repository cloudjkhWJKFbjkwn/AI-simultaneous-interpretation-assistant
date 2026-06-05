# 🎙️ AI 同声传译助手 (Web Demo)

> 浏览器端实时英文语音识别工具，适用于观看英文演讲、技术分享和在线课程。

## 🏗️ 架构

```
麦克风 → AudioCapture (PCM 16kHz) → 音量检测断句
    → SpeechRecognitionService → /api/baidu-asr (Vite 代理)
    → 百度短语音识别 REST API → 语义断句显示
```

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置百度 AI 密钥
cp .env.example .env
# 编辑 .env 填入 BAIDU_API_KEY 和 BAIDU_SECRET_KEY
# 需在百度 AI 控制台开通：短语音识别、实时语音识别

# 3. 启动开发服务器
npm run dev

# 4. 打开 http://localhost:5173
```

### Vercel 部署

```bash
npx vercel --prod
```
环境变量: `BAIDU_API_KEY`, `BAIDU_SECRET_KEY`

## 🧠 断句策略

- **音量检测**: 停顿 ~1 秒自动切割音频发送
- **定时兜底**: 最长 3 秒强制发送
- **语义断句**: 识别结果按标点符号 + 长度智能分句

## 🔧 技术栈

React 19 + TypeScript + Vite 8 · Tailwind CSS v4 · 百度 AI 短语音识别 · Vercel Serverless

## 📁 项目结构

```
src/
├── App.tsx                          # 主界面
├── hooks/useSpeechRecognition.ts    # 语音识别状态管理
└── services/
    ├── AudioCapture.ts              # 麦克风 + PCM 采集
    └── SpeechRecognitionService.ts  # 百度 ASR 客户端
api/
└── baidu-token.ts                   # Vercel Token 代理
```
