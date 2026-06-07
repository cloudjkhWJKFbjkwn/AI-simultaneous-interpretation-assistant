# 🎙️ AI 同声传译助手 (Web Demo)

🔗 **在线体验**：[https://ai-simultaneous-interpretation.netlify.app/](https://ai-simultaneous-interpretation.netlify.app/)

> 浏览器端实时英文语音识别 + 智能翻译工具，适用于英文演讲、技术分享和在线课程。

## 🏗️ 架构

```
麦克风 → AudioCapture (PCM 16kHz) → 音量检测断句
    → SpeechRecognitionService → /api/baidu-asr → 百度短语音识别
    → 碎片防抖合并 (800ms)
    → AsrPostProcessor → DeepSeek LLM 纠错 + 语义重建
    → TranslationService → /api/baidu-translate → 百度翻译
    → SubtitleContext (useReducer 状态机)
    → 实时中英双语字幕（暗色模式 / 手动编辑 / 导出）
```

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置 API 密钥
cp .env.example .env
# 编辑 .env 填入以下密钥：

# 百度 AI 语音识别（必填）
BAIDU_API_KEY=xxx
BAIDU_SECRET_KEY=xxx

# 百度文本翻译（必填）
BAIDU_APP_ID=xxx
BAIDU_TRANSLATE_SECRET_KEY=xxx

# DeepSeek LLM 纠错（必填）
DEEPSEEK_API_KEY=sk-xxx

# 翻译策略
VITE_TRANSLATION_STRATEGY=baidu

# 3. 启动
npm run dev
# 打开 http://localhost:5173
```

### 🌐 线上部署（Vercel）

详见 [demo/README.md](demo/README.md)。

### 🔑 注册 API

| 服务 | 地址 | 
|------|------|
| 百度语音识别 | https://console.bce.baidu.com/ai/#/ai/speech/app/list | 
| 百度文本翻译 | https://fanyi-api.baidu.com | 
| DeepSeek LLM | https://platform.deepseek.com/api_keys |

## 📋 功能特性

- 🎤 **实时语音识别**：百度短语音 REST API，音量检测 + 防抖断句
- 🤖 **LLM 语义纠错**：DeepSeek 纠正同音词/语法/标点，碎片重建为完整句子
- 🌐 **百度翻译**：英文 → 中文，逐句实时翻译
- 📝 **上下文修正**：检测转折词（but/however/actually），自动重译前文
- 🔄 **语义断句**：LLM 判断句子完整性，不完整自动合并
- 🎨 **暗色模式**：一键切换亮色/暗色，localStorage 持久化
- ✏️ **手动编辑**：在线编辑原文/译文，自动重译
- ⭐ **标记重点**：点击字幕卡片切换星标
- 📤 **多格式导出**：TXT / Markdown / JSON
- 🪟 **悬浮字幕窗**：独立窗口，桌面歌词风格，颜色可调
- 🛡️ **边界保护**：连续错误自动停止、空闲提醒、字幕上限 200 条

## 🔧 技术栈

React 19 + TypeScript + Vite 8 · Tailwind CSS v4 · 百度 AI 短语音识别 · 百度文本翻译 · DeepSeek LLM · Vercel Serverless

## 📂 项目结构

```
src/
├── App.tsx                            # 主界面（暗色模式 + toast 提示）
├── popup.tsx                          # 悬浮字幕窗
├── context/
│   └── SubtitleContext.tsx            # 全局字幕上下文 + BroadcastChannel 同步
├── hooks/
│   ├── useSpeechRecognition.ts        # 语音识别 + 翻译 + 防抖合并
│   ├── useSubtitleManager.ts          # useReducer 字幕状态机
│   ├── useAutoScroll.ts              # 智能滚动
│   ├── useDrag.ts                    # 拖拽
│   └── useWordPopover.ts            # 单词弹窗
├── components/
│   ├── SubtitleList.tsx              # 字幕列表
│   ├── SubtitleItem.tsx              # 字幕卡片（编辑/修正标记）
│   └── WordPopover.tsx              # 单词释义弹窗
├── services/
│   ├── AudioCapture.ts               # 麦克风 PCM 采集
│   ├── SpeechRecognitionService.ts   # 百度 ASR 客户端
│   ├── AsrPostProcessor.ts           # DeepSeek LLM 后处理
│   ├── DeepSeekService.ts            # DeepSeek API 客户端
│   ├── LlmService.ts                 # LLM 抽象接口
│   ├── CorrectionService.ts          # 上下文修正引擎
│   ├── TranslationService.ts         # 翻译服务工厂 + LRU 缓存
│   ├── BaiduTranslationService.ts    # 百度翻译客户端
│   ├── MockTranslationService.ts     # 本地词典（300+ 词汇）
│   ├── PunctuationService.ts         # 标点补全引擎
│   ├── ExportService.ts              # 字幕导出（TXT/MD/JSON）
│   └── DictionaryService.ts          # 在线词典
├── types.ts                           # 类型定义
api/
├── baidu-asr.ts                       # Vercel: 百度 ASR 代理
├── baidu-translate.ts                 # Vercel: 百度翻译代理
├── baidu-token.ts                     # Vercel: 百度 Token 代理
└── deepseek.ts                        # Vercel: DeepSeek 代理
```

## 📋 开发进度

| PR | 内容 | 目的 / 说明 | 状态 |
|----|------|-------------|------|
| PR1 | 项目脚手架搭建（React 19 + Vite 8 + Tailwind CSS v4） | 选定现代前端技术栈，搭建可快速迭代的工程骨架 | ✅ main |
| PR2 | 音频捕获与语音识别（百度 ASR REST API + 智能断句） | 核心入口：麦克风实时拾音 → 百度短语音识别 → 文本，为后续翻译链路提供原始输入 | ✅ pr2-speech-recognition |
| PR3 | 翻译服务接入（Mock 本地词典 + 百度翻译 API + 双语字幕） | 先用本地 Mock 词典打通翻译显示流程，再接入百度翻译 API，实现英中双语对照 | ✅ pr3-translation-service |
| PR4 | 字幕状态管理（useReducer 状态机 + SubtitleContext + 标记功能） | 用 Reducer 状态机统一管理字幕生命周期，BroadcastChannel 同步主窗口与悬浮窗 | ✅ pr4-subtitle-manager |
| PR5 | useDrag Hook — 鼠标拖拽逻辑提取 | 将拖拽逻辑从组件中抽离为独立 Hook，方便多处复用和单独测试 | ✅ pr5-use-drag |
| PR6 | useAutoScroll Hook — 智能滚动逻辑提取 | 新字幕自动滚到底部，用户手动滚动时暂停，避免打断阅读 | ✅ pr6-use-autoscroll |
| PR7 | SubtitleItem + SubtitleList — 基础渲染与入场动画 | 实现字幕卡片渲染和入场动画，奠定 UI 骨架 | ✅ pr7-subtitle-components |
| PR8 | WordPopover — 单词释义弹窗 | 点击英文单词弹出在线词典释义，帮助理解专业生词 | ✅ pr7-subtitle-components |
| PR9 | FloatingWindow — 拖拽 + 折叠 + 独立字幕窗 | 将字幕独立为悬浮窗，适合全屏演讲等场景，不遮挡主内容 | ✅ pr9-floating-window |
| PR10 | FloatingWindow — 桌面字幕风格 + 字体颜色选择 | 优化悬浮窗视觉为桌面字幕风格，支持自定义字体颜色 | ✅ pr10-lyrics-style |
| PR11 | 字幕手动编辑 — inline 编辑 + 自动重译 | 允许在线修改识别原文或翻译译文，编辑后自动触发重译 | ✅ pr11-subtitle-edit |
| PR12 | 字幕导出（TXT / Markdown / JSON） | 将整场会议字幕导出为多种格式，方便会后整理、分享和存档 | ✅ pr12-subtitle-export |
| PR13 | 上下文修正 — 转折词检测 + 根据后文自动修正前文翻译 | 检测转折词（but/however/actually），利用后文语境回修前文翻译，提升整体连贯性 | ✅ pr13-context-correction |
| PR14 | ASR 后处理 — DeepSeek LLM 纠错 + 碎片防抖合并 + 百度翻译代理 | 用 DeepSeek 纠正同音词/语法/标点，800ms 防抖合并碎片减少 API 调用 | ✅ pr14-asr-postprocess |
| PR15 | 语义断句 — LLM 判断句子完整性，不完整自动合并 | 用 LLM 判断句子是否完整，不完整则与后续碎片合并，避免产出断句翻译 | ✅ pr15-semantic-segmentation |
| PR16 | 边界处理 — 连续错误自动停止、空文本过滤、空闲提醒、弹出窗口错误提示 | 处理连续识别失败、空闲无输入、字幕上限等异常场景，提升系统鲁棒性 | ✅ pr16-edge-cases |
| PR17 | UI 打磨 — 暖灰配色 + 暗色模式 + 全宽布局 + 响应式 | 统一暖灰配色与暗色模式，全宽响应式布局适配不同屏幕 | ✅ pr17-ui-polish |
| PR18 | Vercel 部署 — Serverless API 代理 + 文档更新 | 通过 Vercel Serverless 代理百度/DeepSeek API，解决浏览器跨域，实现一键部署 | ✅ pr18-deploy |

## 🗺️ 未来改进方向

- 🖥️ **系统级悬浮窗**：将字幕窗从独立浏览器窗口升级为系统级悬浮窗（Picture-in-Picture / 桌面 overlay），不受窗口切换影响
- 📚 **专业术语增强**：引入不同领域的专业词典（医学、法律、计算机等）或接入领域微调大模型，提升专业场景翻译准确度
- 🤖 **多模型自由切换**：接入更多 AI 模型（GPT、Claude、Gemini 等），允许用户根据场景自主选择 ASR / 纠错 / 翻译模型
- 🎬 **音视频文件翻译**：支持上传音频/视频文件，自动提取语音并生成翻译字幕，同时允许用户自行编辑插入字幕
