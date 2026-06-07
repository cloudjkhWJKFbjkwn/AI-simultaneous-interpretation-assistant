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

### PR1 — 项目脚手架搭建
**内容**：React 19 + Vite 8 + Tailwind CSS v4 基础工程搭建。
**目的**：选定现代前端技术栈，搭建可快速迭代的工程骨架，作为整个项目的起点。
> ✅ 已合入 main

### PR2 — 音频捕获与语音识别
**内容**：麦克风 PCM 16kHz 采集 + 百度短语音识别 REST API + 音量检测智能断句。
**目的**：核心入口链路，将实时语音转为文本，为后续翻译链路提供原始输入。
> ✅ pr2-speech-recognition

### PR3 — 翻译服务接入
**内容**：Mock 本地词典（300+ 词汇）先行打通翻译显示流程，随后接入百度翻译 API，实现英中双语字幕对照。
**目的**：先以低成本 Mock 快速验证 UI 和交互逻辑，再接入正式翻译服务。
> ✅ pr3-translation-service

### PR4 — 字幕状态管理
**内容**：useReducer 状态机构建字幕生命周期管理，SubtitleContext 全局共享，BroadcastChannel 实现主窗口与悬浮窗同步。
**目的**：将字幕的识别→翻译→修正→编辑→导出全流程纳入统一状态机，避免状态散落各处。
> ✅ pr4-subtitle-manager

### PR5 — useDrag Hook
**内容**：将鼠标拖拽逻辑从组件中抽离为独立 Hook（useDrag），提供 DragPosition、UseDragOptions 等类型定义。
**目的**：提升拖拽逻辑的可复用性和可测试性。
> ⚠️ 目前未被任何组件引用，拖拽功能实际在组件内内联实现
> ✅ pr5-use-drag

### PR6 — useAutoScroll Hook
**内容**：智能滚动逻辑提取为独立 Hook，新字幕出现时自动滚到底部，用户手动滚动时暂停。
**目的**：避免自动滚动打断用户正在阅读的内容，兼顾实时性和阅读体验。
> ✅ pr6-use-autoscroll

### PR7 — SubtitleItem + SubtitleList 基础渲染
**内容**：实现字幕卡片（SubtitleItem）和字幕列表（SubtitleList）组件，包含入场动画。
**目的**：奠定 UI 渲染骨架，建立字幕显示的基础组件体系。
> ✅ pr7-subtitle-components

### PR8 — WordPopover 单词释义弹窗
**内容**：点击英文单词弹出在线词典释义弹窗。
**目的**：帮助用户在听讲过程中即时理解生僻或专业词汇，无需跳出当前界面。
> ✅ pr7-subtitle-components

### PR9 — FloatingWindow 独立字幕窗
**内容**：将字幕抽离为独立悬浮窗（popup.tsx），支持拖拽和折叠。
**目的**：适合全屏演讲、屏幕共享等场景，字幕不遮挡主内容区域。
> ✅ pr9-floating-window

### PR10 — FloatingWindow 桌面字幕风格
**内容**：优化悬浮窗视觉为桌面字幕风格，增加字体颜色自定义选项。
**目的**：提升悬浮窗的视觉体验和个性化程度，使其更像专业桌面字幕工具。
> ✅ pr10-lyrics-style

### PR11 — 字幕手动编辑
**内容**：支持 inline 在线编辑识别原文或翻译译文，编辑后自动触发重译。
**目的**：当识别或翻译有误时，用户可即时修正并立即看到更新后的翻译。
> ✅ pr11-subtitle-edit

### PR12 — 字幕导出
**内容**：支持将整场会议字幕导出为 TXT / Markdown / JSON 三种格式。
**目的**：方便会后整理、分享笔记、存档回顾或将字幕用于其他用途。
> ✅ pr12-subtitle-export

### PR13 — 上下文修正
**内容**：检测转折词（but / however / actually 等），根据后续语境自动回修前文翻译。
**目的**：解决演讲中常见的"先立后破"句式导致前文翻译不准确的问题，提升整体连贯性。
> ✅ pr13-context-correction

### PR14 — ASR 后处理（LLM 纠错）
**内容**：引入 DeepSeek LLM 对 ASR 识别结果进行后处理——纠错（同音词、语法、标点）+ 碎片防抖合并（800ms）+ 百度翻译代理。
**目的**：语音识别难免产生碎片和错误，LLM 后处理可将碎片重建为完整、准确的句子，同时减少 API 调用次数。
> ✅ pr14-asr-postprocess

### PR15 — 语义断句
**内容**：利用 LLM 判断当前识别文本是否为完整句子，不完整则自动与后续碎片合并。
**目的**：避免将半个句子（如 "I think that..."）单独送去翻译，产生语义断裂的译文。
> ✅ pr15-semantic-segmentation

### PR16 — 边界处理
**内容**：处理连续识别错误自动停止、空文本过滤、空闲无输入提醒、弹出窗口错误提示、字幕上限 200 条等异常场景。
**目的**：提升系统鲁棒性，避免边缘情况下的崩溃、静默失败或资源耗尽。
> ✅ pr16-edge-cases

### PR17 — UI 打磨
**内容**：统一暖灰配色、暗色模式、全宽响应式布局。
**目的**：提升整体视觉体验，适配不同屏幕尺寸和用户偏好。
> ✅ pr17-ui-polish

### PR18 — Vercel 部署
**内容**：通过 Vercel Serverless 代理百度 ASR / 翻译 / DeepSeek API，解决浏览器跨域问题，实现一键部署上线。
**目的**：让项目可以低成本上线，无需自建后端服务器即可提供完整的 API 代理能力。
> ✅ pr18-deploy

## 🗺️ 未来改进方向

- 🖥️ **系统级悬浮窗**：将字幕窗从独立浏览器窗口升级为系统级悬浮窗（Picture-in-Picture / 桌面 overlay），不受窗口切换影响
- 📚 **专业术语增强**：引入不同领域的专业词典（医学、法律、计算机等）或接入领域微调大模型，提升专业场景翻译准确度
- 🤖 **多模型自由切换**：接入更多 AI 模型（GPT、Claude、Gemini 等），允许用户根据场景自主选择 ASR / 纠错 / 翻译模型
- 🎬 **音视频文件翻译**：支持上传音频/视频文件，自动提取语音并生成翻译字幕，同时允许用户自行编辑插入字幕
