# 🎙️ AI 同声传译助手 (Web Demo)

> 浏览器端实时英文语音识别 + 中文翻译工具，适用于观看英文演讲、技术分享和在线课程。

## 🏗️ 架构

```
麦克风 → AudioCapture (PCM 16kHz) → 音量检测断句     → SpeechRecognitionService → /api/baidu-asr (Vite 代理)
     → 百度短语音识别 REST API → 语义断句
     → TranslationService → SubtitleContext (useReducer 状态机)
     → 实时中英双语字幕展示（可标记重点、自动修正）
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

### 翻译策略

| 策略 | 说明 | 配置 |
|------|------|------|
| `mock` | 本地词典翻译（默认），无需 API，零延迟 | `VITE_TRANSLATION_STRATEGY=mock` |
| `baidu` | 百度文本翻译 API，每月免费 150 万字符 | `VITE_TRANSLATION_STRATEGY=baidu` + `BAIDU_APP_ID` |

### Vercel 部署

```bash
npx vercel --prod
```
环境变量: `BAIDU_API_KEY`, `BAIDU_SECRET_KEY`, `VITE_TRANSLATION_STRATEGY`

## 📝 断句策略

- **音量检测**: 停顿 ~1 秒自动切割音频发送
- **定时兜底**: 最长 3 秒强制发送
- **语义断句**: 识别结果按标点符号 + 长度智能分句

## 🎬 字幕管理

- **`useReducer` 状态机**：原子化操作 `add` / `correct` / `toggleMark` / `edit` / `clear`，不触发无关条目重渲染
- **`SubtitleContext`**：全局字幕上下文，跨组件共享字幕状态，避免 props drilling
- **标记重点**：点击字幕卡片切换星标 ⭐，导出时高亮显示
- **版本追踪**：修正译文时递增 `version` 字段，支持后续上下文修正
- **上限保护**：最多保留 500 条字幕，超出自动清理最早条目
- **手动编辑**：鼠标悬停时显示编辑按钮 ✎，点击进入编辑模式，失焦自动保存，编辑后边框变为蓝色虚线

## 🔧 技术栈

React 19 + TypeScript + Vite 8 · Tailwind CSS v4 · 百度 AI 短语音识别 · 百度文本翻译 API · Vercel Serverless

## 📂 项目结构

```
src/
├── App.tsx                            # 主界面（双语字幕卡片 + 标记交互）
├── context/
│   └── SubtitleContext.tsx            # 全局字幕上下文 Provider
├── hooks/
│   ├── useSpeechRecognition.ts        # 语音识别 + 翻译状态管理
│   ├── useSubtitleManager.ts         # useReducer 字幕状态机
│   ├── useAutoScroll.ts              # 智能滚动 Hook
│   ├── useDrag.ts                    # 拖拽 Hook
│   └── useWordPopover.ts            # 单词弹窗 Hook
├── components/
│   ├── SubtitleList.tsx              # 字幕列表容器
│   ├── SubtitleItem.tsx              # 单条字幕卡片
│   └── WordPopover.tsx              # 单词释义弹窗
├── types.ts                           # 类型定义
└── services/
    ├── AudioCapture.ts                # 麦克风 + PCM 采集
    ├── SpeechRecognitionService.ts    # 百度 ASR 客户端
    ├── PunctuationService.ts          # 标点补全引擎
    ├── TranslationService.ts          # 翻译服务工厂 + LRU 缓存
    ├── MockTranslationService.ts      # 本地词典翻译（300+ 词汇）
    ├── BaiduTranslationService.ts     # 百度翻译 API 客户端
    └── DictionaryService.ts           # 在线词典服务
api/
└── baidu-token.ts                     # Vercel Token 代理
```


## 📋 开发进度

| PR | 内容 | 状态 |
|----|------|------|
| PR1 | 项目脚手架搭建（React 19 + Vite 8 + Tailwind CSS v4） | ✅ master |
| PR2 | 音频捕获与语音识别（百度 ASR REST API + 智能断句） | ✅ master |
| PR3 | 翻译服务接入（Mock 本地词典 + 百度翻译 API + 双语字幕） | ✅ pr3-translation-service |
| PR4 | 字幕状态管理（useReducer 状态机 + SubtitleContext + 标记功能） | ✅ pr4-subtitle-manager |
| PR5 | useDrag Hook — 鼠标拖拽逻辑提取 | ✅ codex/pr5-use-drag |
| PR6 | useAutoScroll Hook — 智能滚动逻辑提取 | ✅ codex/pr6-use-autoscroll |
| PR7 | SubtitleItem + SubtitleList — 基础渲染与入场动画 | ✅ codex/pr7-subtitle-components |
| PR8 | WordPopover — 单词释义弹窗 | ✅ codex/pr7-subtitle-components |
| PR9 | FloatingWindow — 拖拽 + 折叠 + 独立字幕窗 | ✅ codex/pr9-floating-window |
| PR10 | FloatingWindow — 桌面歌词风格 + 字体颜色选择 | ✅ codex/pr10-lyrics-style |
| PR11 | 字幕手动编辑 — inline 编辑 + 自动重译 | ✅ codex/pr11-subtitle-edit |
| PR12 | 字幕导出（TXT / Markdown / JSON） | ⬜ 待开发 |
| PR13 | 设置面板（导出格式、字体颜色等，localStorage 持久化） | ⬜ 待开发 |
| PR14 | 上下文修正（根据后文修正前文翻译） | ⬜ 待开发 |
| PR15 | 集成联调与 UI 打磨（全链路 + 边界 + 暗色模式） | ⬜ 待开发 |