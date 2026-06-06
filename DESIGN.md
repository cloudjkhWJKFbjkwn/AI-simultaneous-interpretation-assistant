# AI 同声传译助手 — 设计文档

## 1. 项目概述

**目标**：浏览器端实时英文语音识别 + 中文翻译工具。面向观看英文演讲、技术分享、在线课程等场景。

**核心流程**：说出英文 → ASR 识别 → LLM 语义纠错 → 断句合并 → 翻译 → 中英双语字幕。

## 2. 架构

```
┌──────────┐   PCM 16kHz    ┌──────────────┐    HTTP POST     ┌────────────────┐
│ 麦克风     │ ────────────→ │ AudioCapture  │ ───────────────→ │ /api/baidu-asr  │
│ getUserMedia│              │ AudioContext   │                  │ (Vite 代理 /    │
└──────────┘                │ ScriptProcessor│                  │  Vercel 函数)   │
                            └──────────────┘                  └───────┬────────┘
                                                                      │
                                                            vop.baidu.com REST API
                                                                      │
                                                              识别文本 + 标点
                                                                      │
                                                              ┌───────▼────────┐
                                                              │ 碎片防抖合并    │
                                                              │ (800ms 窗口)   │
                                                              └───────┬────────┘
                                                                      │
                                                              ┌───────▼────────┐
                                                              │ AsrPostProcessor│
                                                              │ DeepSeek LLM   │
                                                              │ 纠错 + 语义重建 │
                                                              └───────┬────────┘
                                                                      │
                                               ┌──────────────────────┼──────────────────┐
                                               │                      │                  │
                                        ┌──────▼──────┐       ┌──────▼──────┐    ┌──────▼──────┐
                                        │ 语义完整？   │       │ Translation │    │ Correction  │
                                        │ (LLM 判断)  │       │ Service     │    │ Service     │
                                        └──┬──────┬───┘       └──────┬──────┘    └──────┬──────┘
                                           │      │                   │                  │
                                    完整    │      │ 不完整            │                  │
                                    ┌───────┘      └──────┐           │                  │
                                    ▼                      ▼           ▼                  ▼
                               发射字幕               继续累积     百度翻译 API      转折词检测
                                                                                   修正前文
```

## 3. 数据流

```
ASR 原始文本 → 标点补全 (PunctuationService)
    → 碎片缓冲 (800ms)
    → DeepSeek LLM 纠错 (AsrPostProcessor)
         ↓
    语义断句：完整？→ 不完整则累积 (最多 4 轮)
         ↓ 完整
    TranslationService
         ↓
    /api/baidu-translate → 百度 API → 中文
         ↓
    SubtitleContext (useReducer)
    · add / correct / autoCorrect / edit / clear
    · version 追踪 · corrected 标记
         ↓
    字幕展示 + 悬浮窗
```

## 4. 关键模块

### 4.1 语音识别 (SpeechRecognitionService)

- 百度短语音 REST API + Vite 代理
- 音量检测断句：静音 ~1 秒切割 + 最长 3 秒强制发送
- 标点补全：`PunctuationService` 常用词表 + 规则恢复

### 4.2 LLM 后处理 (AsrPostProcessor)

- 模型：DeepSeek (`deepseek-chat`)
- 功能：纠正同音词/语法错误、重建被切断的句子、补标点
- 防抖：800ms 窗口内碎片合并后一次纠错
- 语义断句：LLM 判断句子完整性（以 and/but/to/the 等结尾 → 继续累积）

### 4.3 翻译 (TranslationService)

- 策略：`mock`（本地词典 300+ 词汇）/ `baidu`（百度翻译 API）
- LRU 缓存：500 条，归一化 key（去标点小写）
- 百度翻译 API 通过 Vite/Vercel 代理调用，sign 签名服务端完成

### 4.4 字幕管理 (SubtitleContext + useSubtitleManager)

- `useReducer` 状态机：`add` / `correct` / `autoCorrect` / `edit` / `toggleMark` / `clear`
- 上限 200 条，超出自动清理 + 提示
- `BroadcastChannel` 同步主页面和悬浮窗
- 手动编辑后边框变蓝色虚线，自动修正后绿色边框 + ✨

### 4.5 上下文修正 (CorrectionService)

- 检测 18 个转折词（but, however, actually, i mean, though, instead...）
- 触发时取前 2 句原文 + 当前句 → 重译 → `autoCorrect`
- 防重复修正（processingSet）

### 4.6 边界处理

| 场景 | 处理 |
|------|------|
| API 连续失败 ≥ 3 次 | 自动停止 + toast + 重试按钮 |
| 空文本 | 静默过滤 |
| 3 分钟无语音 | 空闲提醒 |
| 字幕超 200 条 | 自动清旧 + 警告 |
| 错误 | 通过 BroadcastChannel 同步到悬浮窗 |

### 4.7 导出 (ExportService)

- TXT：`[HH:MM:SS] 原文 → 译文`，标记句加 ⭐，修正句加 ✨
- Markdown：表格，标记句加粗，修正句斜体
- JSON：完整 `SubtitleItem[]`

## 5. 技术选型

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS v4 |
| 语音识别 | 百度短语音 REST API |
| LLM 纠错 | DeepSeek chat |
| 翻译 | 百度文本翻译 API |
| 状态管理 | React Context + useReducer |
| 部署 | Vercel / Netlify Serverless |

## 6. 设计决策

- **为什么不用 Web Speech API**：Chrome 内置 API 在中国大陆不可用（Google 服务被墙）
- **为什么用 REST 而非 WebSocket**：百度实时音频流 WebSocket 认证复杂且不稳定，短语音 REST 通过服务端代理可靠性更高
- **为什么 API 走代理**：避免前端暴露密钥 + 绕过浏览器 CORS 限制
- **暗色模式策略**：Tailwind `dark:` + `localStorage` 持久化，切换无闪烁
- **碎片防抖窗口 800ms**：平衡实时性（太快则碎片多）与完整性（太慢则延迟高）

## 7. 项目结构

```
src/
├── App.tsx, popup.tsx, types.ts
├── context/SubtitleContext.tsx
├── hooks/
│   ├── useSpeechRecognition.ts  # 识别 + 防抖 + 断句
│   ├── useSubtitleManager.ts    # useReducer 状态机
│   └── useAutoScroll.ts, useDrag.ts, useWordPopover.ts
├── components/
│   ├── SubtitleList.tsx, SubtitleItem.tsx, WordPopover.tsx
└── services/
    ├── SpeechRecognitionService.ts  # 百度 ASR
    ├── AsrPostProcessor.ts          # DeepSeek 纠错
    ├── TranslationService.ts        # 翻译工厂 + LRU
    ├── CorrectionService.ts         # 上下文修正
    ├── ExportService.ts             # 字幕导出
    ├── AudioCapture.ts, PunctuationService.ts, DictionaryService.ts
    └── DeepSeekService.ts, LlmService.ts, BaiduTranslationService.ts
api/
├── baidu-asr.ts, baidu-translate.ts, baidu-token.ts, deepseek.ts
```