# AI 同声传译助手 — 设计文档

## 1. 项目概述

**目标**：浏览器端实时英文语音识别字幕工具，面向观看英文演讲、技术分享、在线课程等场景。

**核心用户价值**：说出英文 → 实时显示文字字幕，智能断句保证阅读流畅。

**品牌愿景**：像真人同传译员一样工作——先快速给出译文，再根据后文修正前文错误，字幕始终动态优化。

---

## 2. 架构演进

### 2.1 初版：Web Speech API

| | |
|------|------|
| ASR 引擎 | 浏览器内置 `SpeechRecognition`（Chrome/Edge） |
| 网络依赖 | Google 语音识别服务器 |
| 问题 | **中国大陆 Google 服务被墙 → `network` 错误 → 完全不可用** |

### 2.2 最终版：百度 AI 短语音识别

```
┌──────────┐     PCM 16kHz     ┌──────────────────┐    HTTP POST    ┌──────────────┐
│ 麦克风    │ ─────────────────→ │ AudioCapture     │ ──────────────→ │ /api/baidu-asr│
│ getUserMedia│                  │ AudioContext      │                 │ (Vite 中间件) │
└──────────┘                    │ ScriptProcessor   │                 └──────┬───────┘
                                 └──────────────────┘                        │
                                                                   server-side fetch
                                                                          │
                                                                ┌─────────▼─────────┐
                                                                │ vop.baidu.com     │
                                                                │ /server_api       │
                                                                │ (REST API)        │
                                                                └────────┬──────────┘
                                                                         │
                                                                 识别文本 + 语义分句
                                                                         │
                                                                ┌────────▼──────────┐
                                                                │ TranslationService │
                                                                │ Mock / 百度翻译API  │
                                                                │ (Vite 中间件代理)   │
                                                                └────────┬──────────┘
                                                                         │
                                                                  双语字幕展示
```

**为什么不用实时语音识别 (WebSocket) 而用短语音识别 (REST)？**

| 尝试 | 方法 | 结果 |
|------|------|------|
| WebSocket `?sn=TOKEN` | token-based auth | `-3008 parse appid failed` |
| WebSocket + `appid` | app-based auth | `-3008 parse appkey failed` |
| WebSocket + `appid` + `appkey` | 双认证 | `-3004 Invalid param sn` |
| WebSocket 无 `?sn=` + 帧内 `token` | 帧内认证 | 无法建立连接 (code=1006) |
| **REST API `server_api` + Vite 代理** | server-to-server | ✅ 成功 |

**根因**：`wss://vop.baidu.com/realtime_asr` 的 `sn` token 认证与 `appid`/`appkey` 帧内认证存在冲突，多次组合均失败。短语音 REST API 通过服务端代理彻底绕开此问题。

---

## 3. 数据流设计

```
[麦克风] ──PCM──→ [AudioCapture] ──Int16Array──→ [SpeechRecognitionService]
                                                        │
                                              音量检测 + 断句逻辑
                                                        │
                                               HTTP POST /api/baidu-asr
                                                        │
                                              Vite Middleware → 百度 server_api
                                                        │
                                                返回 JSON 识别结果
                                                        │
                                              textBuffer 累积 + 语义分句
                                                        │
                                          ┌──────────────┴──────────────┐
                                          │  interim (进行中)  final (完整句) │
                                          └──────────────┬──────────────┘
                                                         │
                                                  [TranslationService]
                                                  Mock / 百度翻译 API
                                                         │
                                                  [SubtitleManager]
                                                         │
                                          ┌──────────────┼──────────────┐
                                          │  addSubtitle  correctSubtitle  │
                                          └──────────────┼──────────────┘
                                                         │
                                                  [Subtitle UI]
                                                  (悬浮窗渲染)
```

### 核心接口

```typescript
// 音频采集
interface AudioCapture {
  start(onPcmData: (data: Int16Array, sampleRate: number) => void): Promise<void>;
  stop(): void;
  isActive(): boolean;
}

// 语音识别服务
interface SpeechRecognitionService {
  start(onResult: RecognitionCallback, onError: ErrorCallback, onEnd: EndCallback): void;
  stop(): void;
}

type RecognitionCallback = (text: string, isFinal: boolean) => void;
type ErrorCallback = (error: string) => void;
type EndCallback = () => void;

// 翻译服务 (PR3)
interface TranslationService {
  translate(text: string): Promise<string>;
}

// 字幕条目
interface SubtitleItem {
  id: string;
  sourceText: string;
  translatedText: string;
  timestamp: number;
  marked: boolean;
  version: number; // 0 = 初译, >0 = 修正次数
}
```

---

## 4. PR 拆解（共 9 个 PR）

### PR1：项目脚手架搭建 ✅

**为什么这个 PR 先做？**

任何软件项目的第一步都是建立"可运行的空壳"——一个能从零到一跑起来的骨架。这个 PR 不涉及任何业务逻辑，纯粹是搭建基础设施。选择 Vite + React 18 + TypeScript + Tailwind CSS v4 这套技术栈，是因为它兼顾了开发体验（Vite 的极速 HMR）、类型安全（TypeScript）、和生产级 UI 开发效率（Tailwind 的 utility-first 模式）。

三栏式布局（顶部状态栏 → 中间弹性字幕区 → 底部控制栏）奠定了整个应用的视觉基调：上方展示"系统在做什么"，中间展示"识别出了什么"，下方提供"用户能做什么"。这种布局设计参考了 OBS 和 Streamlabs 等直播工具的信息层级模式。

**设计决策**：
- **为什么不用 Create React App？** CRA 已不再维护，Vite 的 HMR 速度在开发阶段至关重要（改动代码到浏览器刷新 < 100ms）。
- **为什么 Tailwind v4 而不是 CSS Modules？** Tailwind 的 `@tailwindcss/vite` 插件实现了真正的零配置集成，不需要 `postcss.config.js` 或 `tailwind.config.js`，且 v4 的 `@layer` 语法让深色模式适配变得极为简单。
- **状态指示灯为什么要呼吸动画？** 同传场景下用户需要快速瞥一眼就知道"现在在不在工作"，红/黄/绿三色 + `animate-pulse` 提供了无需阅读文字的即时感知。

**实现思路**：
- 使用 Vite 初始化 React 18 + TypeScript 项目，Vite 作为构建工具提供最快的 HMR 体验
- 安装 Tailwind CSS v4 并使用 `@tailwindcss/vite` 插件零配置集成
- 采用 utility-first 的样式策略，不写自定义 CSS，全部通过 Tailwind 原子类完成
- 页面布局采用三栏式：顶部标题栏（品牌展示 + 状态指示灯）→ 中间字幕区（flex-1 撑满剩余空间）→ 底部控制栏（固定 footer）
- 状态指示灯：红点 = 断开、黄点 = 连接中、绿点 = 监听中，使用 Tailwind 的 `animate-pulse` 实现呼吸效果

**关键文件**：
- `vite.config.ts` — Vite 配置，引入 React + Tailwind 插件
- `package.json` — 项目依赖声明
- `src/index.css` — Tailwind 入口 + 全局基础样式
- `src/App.tsx` — 主布局组件
- `src/main.tsx` — React 挂载入口
- `index.html` — HTML 模板

**验收标准**：
- `npm run dev` 正常启动，浏览器访问 `localhost:5173` 看到完整布局
- `tsc --noEmit` 零类型错误
- `vite build` 生产构建通过，产物大小合理（<200KB gzip）

---

### PR2：音频捕获与语音识别 ✅

**为什么这个 PR 是核心突破？**

第一版使用浏览器内置 `SpeechRecognition`（Web Speech API），但该 API 依赖 Google 的语音识别服务器——在中国大陆被墙，直接报 `network` 错误。这是项目面临的第一个"生死攸关"问题：如果连语音都识别不了，后面的一切（翻译、字幕、TTS）都无从谈起。

PR2 的核心任务是**找到一条在中国大陆可用的语音识别通路**。经过多轮技术调研和测试，最终方案是：百度 AI 短语音识别 REST API + Vite 服务端中间件代理。

**技术选型的坎坷历程**（这些失败尝试本身就是宝贵的知识沉淀）：

| 尝试 | 方案 | 结果 | 根因 |
|------|------|------|------|
| 1 | Web Speech API | `network` 错误 | Google 被墙 |
| 2 | 百度 WebSocket API + `?sn=TOKEN` | `-3008 parse appid failed` | token 认证冲突 |
| 3 | WebSocket + `appid` 帧内认证 | `-3008 parse appkey failed` | 双认证机制不兼容 |
| 4 | WebSocket + `appid` + `appkey` 双认证 | `-3004 Invalid param sn` | sn 参数格式要求未知 |
| 5 | WebSocket 无 `?sn=` + 帧内 `token` | 连接失败 code=1006 | 协议握手被拒 |
| **6** | **REST API + Vite 代理** | **✅ 成功** | 服务端到服务端无 CORS |

**断句策略为什么是三层？** 单一策略都有缺陷：纯音量断句在背景噪音下不可靠；纯定时断句会把句子切得支离破碎；纯标点断句依赖识别结果足够准确。三层互补——音量做主力（自然停顿触发），定时做兜底（防止长句堆积），标点做精修（语义完整性检查）——才能在实际场景中稳定工作。

**设计决策**：
- **为什么用 Vite 中间件而不是 Vercel Function？** 开发阶段 Vercel CLI 也有沙箱问题，Vite 中间件可以直接在 `vite.config.ts` 中内联实现，零额外依赖，且 HMR 不中断。生产部署时再切换到 `api/baidu-token.ts`。
- **为什么 API Key 硬编码在 vite.config.ts？** 开发阶段的妥协。理想方案是 `.env` + `import.meta.env`，但 Codex sandbox 下 PowerShell 环境变量的传递有兼容性问题。生产部署用 Vercel 环境变量彻底解决。
- **AudioContext.sampleRate 为什么是约 16000Hz？** 不是我们选择的——浏览器的 `AudioContext` 会根据系统硬件自动选择采样率，大多数设备默认 44100Hz 或 48000Hz，但我们实际传给百度的 rate 必须与实际采集的采样率一致，否则会报 `3311 param rate invalid`。

**实现思路**：
- **AudioCapture 模块**：封装 `getUserMedia` 获取麦克风权限 → `AudioContext` 创建音频处理图 → `ScriptProcessorNode` 监听 `audioprocess` 事件 → 将 Float32 采样转为 Int16 PCM 数据 → 通过回调推送给下游
- **SpeechRecognitionService 模块**：接收 PCM 数据 → 音量 RMS 检测 → 累积到 `audioChunks[]` → 静音超 1 秒触发发送 → HTTP POST 到 `/api/baidu-asr` → 百度返回识别文本 → 累积到 `textBuffer` → 语义分句（按 `.` `!` `?`）→ 输出 `interim`（进行中）和 `final`（完整句）事件
- **Vite 中间件 `/api/baidu-token`**：用 API Key + Secret Key 向 `aip.baidubce.com` 换取 `access_token`，缓存 30 天避免重复请求
- **Vite 中间件 `/api/baidu-asr`**：接收前端发来的 PCM 音频 → 转发到 `vop.baidu.com/server_api` → 返回 JSON 识别结果（`err_no: 0` 表示成功，`result[0]` 为识别文本）
- **useSpeechRecognition Hook**：统一管理 AudioCapture 和 SpeechRecognitionService 的生命周期 → 暴露 `start/stop` 方法和 `interimText/completedSentences/isListening/error` 状态

**三层断句策略**：
1. **音量触发** — 连续 8 帧音频 RMS < 600 → 约 1 秒停顿 → 自动切割发送
2. **定时兜底** — 最长 3 秒无停顿 → 强制发送，避免长句无限堆积
3. **语义分句** — 识别文本累计后按标点（`.!?`）+ 80 字符长度二次切割

**关键文件**：
- `src/services/AudioCapture.ts` — 音频采集 + PCM 输出
- `src/services/SpeechRecognitionService.ts` — 百度 ASR 客户端 + 断句引擎
- `src/hooks/useSpeechRecognition.ts` — React Hook 状态管理
- `vite.config.ts` — 中间件代理（`/api/baidu-token` + `/api/baidu-asr`）

**验收标准**：
- 点击「开始监听」→ 允许麦克风 → 状态显示「监听中」
- 说英文 → 1-3 秒内在页面看到识别文本
- 停顿 ~1 秒自动分句，显示为独立字幕条目
- 点击「停止监听」→ 麦克风释放，状态回到「待命」

---

### PR3：翻译服务接入 ✅

**目标**：将英文识别结果实时翻译为中文，支持 Mock 本地词典和百度文本翻译 API 两种策略。

**为什么放在 PR3？**

PR2 完成了"听懂英文"，PR3 要实现"翻译成中文"——这是产品从"英文转写工具"到"同声传译助手"的关键一步。PR3 独立于 PR2 的音频链路，二者通过 `useSpeechRecognition` 暴露的 `completedSentences` 接口解耦。

**为什么留两个翻译策略（Mock + 百度 API）？**

这不是过度设计。Mock 模式（本地词典映射）的价值在于：
1. **开发无网络依赖**：不需要翻译 API Key，CI/CD 可以跑全流程测试。
2. **基准对比**：日后优化翻译引擎时，可以用 Mock 的翻译结果作为基准来评估新引擎质量。
3. **离线兜底**：如果用户没有配置翻译 API，至少能看到一个能用的翻译结果，而不是空白。

百度文本翻译 API 每月免费 50 万字符，延迟通常 < 200ms，是同传场景下兼顾**速度、成本、质量**的最佳国内方案。

**与设计文档的变更**：

原设计使用 OpenAI GPT-4o-mini 作为 LLM 翻译引擎，实际开发中基于以下考量切换为百度翻译 API：
1. **用户意图**：优先国内 AI，不使用 OpenAI
2. **成本**：百度每月 50 万字符免费额度 vs OpenAI 按 token 计费
3. **速度**：百度专用翻译 API 延迟 < 200ms vs LLM 通用推理 > 1s
4. **复用**：已有百度 API Key 和 Secret Key，零额外注册成本

**设计决策**：
- **翻译和识别的数据流为什么完全解耦？** `TranslationService.translate(text)` 是一个纯异步函数，输入英文文本，输出中文字符串。它与 AudioCapture、SpeechRecognitionService 没有任何直接依赖。未来替换翻译引擎只需修改一个文件。
- **为什么翻译策略配置化？** `TranslationConfig.strategy` 枚举（`mock | baidu`）通过环境变量 `VITE_TRANSLATION_STRATEGY` 注入，不在代码中硬编码。
- **增量翻译 vs 全量翻译**：目前设计是"每句独立翻译"（stateless），不做上下文感知。PR7 的上下文修正会在此基础上叠加修正逻辑。

**实现思路**：
- **TranslationService 接口**：`translate(text: string): Promise<string>`，定义于 `types.ts`
- **MockTranslationService**：内置 280+ 常用英文词汇/短语/句型 → 中文映射表
  - 基础词汇映射：`hello → 你好`、`thank you → 谢谢`、`good morning → 早上好`
  - 简单句型模板匹配：`I think → 我认为`、`I want to → 我想`、`in order to → 为了`
  - 贪婪最长子串匹配算法：优先匹配长短语，再逐词翻译未匹配部分
  - 未匹配词汇标记为 `[未翻译]`
- **BaiduTranslationService**：对接百度通用文本翻译 REST API（`fanyi-api.baidu.com`）
  - Vite 中间件 `/api/baidu-translate` 服务端代理，MD5 签名认证（appid + q + salt + secretKey）
  - 复用已有的 `BAIDU_SECRET_KEY`，新增 `BAIDU_APP_ID` 配置项
  - 完整错误处理和降级策略：请求失败 → 返回原文 + `[翻译失败]` 标记
- **TranslationService 工厂 + LRU 缓存**：
  - `TranslationConfig` 统一管理策略切换（`mock` | `baidu`）
  - `createService(config)` 工厂函数，返回带缓存的 TranslationService 实例
  - LRU 缓存容量 500 条，缓存键为原文的小写归一化形式（去标点、去多余空格）
  - 双向链表实现 O(1) 淘汰和更新
- **PunctuationService**：规则标点引擎，为百度 ASR 返回的纯文本补全标点符号
  - 缩略词修复（`im → I'm`、`dont → don't`）
  - 大小写修正（`i → I`）
  - 末尾标点自动补全（问号/句号）
  - 逗号插入（长并列句自动添加逗号）

**关键文件**：
- `src/services/TranslationService.ts` — 翻译工厂 + LRU 缓存
- `src/services/MockTranslationService.ts` — 本地词典翻译（280+ 条目）
- `src/services/BaiduTranslationService.ts` — 百度翻译 API 客户端
- `src/services/PunctuationService.ts` — 标点补全引擎
- `vite.config.ts` — 新增 `/api/baidu-translate` 中间件
- `src/hooks/useSpeechRecognition.ts` — 扩展为输出 `SubtitleItem[]`
- `src/App.tsx` — 双语字幕卡片 UI
- `.env.example` — 新增 `BAIDU_APP_ID`、`VITE_TRANSLATION_STRATEGY`

**验收标准**：
- Mock 模式下 `"Hello"` → `"你好"`，`"Thank you very much"` → 可读中文
- 百度模式下任意英文句 → 通顺中文，延迟 < 2 秒
- 相同原文不重复请求百度 API（命中 LRU 缓存）
- Mock 模式下覆盖 280+ 个常用词 + 句型模板
- 连续说话时翻译不阻塞、不乱序
- `VITE_TRANSLATION_STRATEGY` 环境变量切换策略即时生效
### PR4：字幕状态管理 + 标记功能 ⬜

**目标**：管理字幕生命周期，支持标记重点、修正译文。

**为什么需要专门的字幕状态管理？**

直觉上，字幕只是一个 `string[]`，用 `useState` 就够了。但实际上，每条字幕有 7 个状态维度：`id`（唯一标识）、`sourceText`（英文原文）、`translatedText`（中文译文）、`timestamp`（时间戳）、`marked`（用户标记）、`version`（修正次数）、`status`（interim/final）。这些维度彼此独立变化——标记不影响译文、修正不影响原文、时间戳永远不变——用简单的 `useState` 管理会导致不必要的整数组重渲染。

`useReducer` + `SubtitleContext` 的分层设计：
- **`useReducer`** 处理原子状态变更，每个 action（`add`、`correct`、`toggleMark`、`clear`）只修改必要的字段，不触发其他条目的 re-render
- **`SubtitleContext`** 将字幕状态广播给所有消费者（悬浮窗 UI、导出服务、TTS 队列），避免 props drilling

**标记功能的价值**：用户在看演讲时标记关键句，事后导出时这些标记句会有星标前缀和粗体样式。这是"从信息消费到信息整理"的转折点——标记让字幕从"看过即忘"变成"重点笔记"。

**设计决策**：
- **为什么是 `useReducer` 而不是 `zustand` 或 `jotai`？** 保持零外部依赖。`useReducer` 是 React 内置能力，对于 4 个 action 类型 + 500 条上限的场景完全够用。如果未来需要中间件（持久化到 IndexedDB），再迁移到外部状态库也不迟。
- **为什么字幕上限是 500 条？** 500 条 × ~200 字符/条 = 100KB 内存，这对浏览器来说可以忽略不计。但 500 条覆盖了约 30 分钟的连续演讲（假设每 3-4 秒一句），实际使用场景中极少超出。超过上限时删除最早条目而非拒绝新增——宁可丢失历史，也不能阻塞新内容。
- **为什么标记和修正是两个独立操作？** 标记是用户主动行为（"这句话很重要"），修正是系统自动行为（"前面翻错了"）。它们的触发源不同，UI 表现也不同（标记是静态星标，修正是闪烁高亮），不应混在一起。

**实现思路**：
- 每条字幕分配唯一 `id`（UUID），携带 `sourceText`（英文）、`translatedText`（中文）、`timestamp`、`marked`（标记状态）、`version`（修正次数）
- `useSubtitleManager` Hook 维护 `SubtitleItem[]` 数组，提供 4 个原子操作：
  - `addSubtitle` — 追加新字幕，带淡入动画触发标记
  - `correctSubtitle` — 根据 `id` 更新译文字段，递增 `version`，触发高亮闪烁
  - `toggleMark` — 切换 `marked` 布尔值，不影响动画
  - `clearSubtitles` — 清空全部字幕，发送前确认
- 内部使用 `useReducer` 管理状态，每次操作返回变更事件列表供 UI 消费
- **标记功能**：用户在悬浮窗中点击某条字幕即标记为重点，标记句在导出时高亮显示
- 字幕上限保护：超过 500 条自动清理最早条目，防止内存泄漏

**关键文件**：
- `src/hooks/useSubtitleManager.ts` — 字幕状态机
- `src/context/SubtitleContext.tsx` — 全局字幕上下文（跨组件共享）
- `src/types.ts` — SubtitleItem / SubtitleAction 类型

**验收标准**：
- 通过 `addSubtitle` 添加的字幕正确追加到数组末尾
- `correctSubtitle` 仅修改指定 id 的字幕，不触及其他条目
- `toggleMark` 切换 `marked` 字段，不产生重复条目
- 500 条上限触发时，最早条目被正确移除

---

### PR5：动态字幕 UI + 悬浮窗设计 ⬜

**目标**：实现可浮动的字幕显示窗口，支持动画、交互和视觉定制。

**为什么悬浮窗是这个产品的"灵魂"？**

同声传译助手的核心使用场景是：用户正在浏览器里看一个英文视频或在线会议，同时需要看到实时字幕。如果字幕嵌在页面内的某个固定区域，用户只能在这个标签页里看到字幕——切换标签页就丢失了。**悬浮窗的本质是让字幕从"页面内"提升到"浏览器之上"**，让字幕成为独立于任何网页内容的叠加层。

这个设计参考了：
- **OBS 的字幕叠加**：直播工具的字幕层独立悬浮在视频之上，透明度可调
- **YouTube 的自动字幕**：新字幕从底部淡入，旧字幕向上滚动
- **Discord 的画中画**：小窗模式跟随用户浏览，不干扰主内容

**悬浮窗的三个核心交互模式**：

1. **固定模式**（默认）：悬浮窗固定在屏幕右下角，半透明毛玻璃背景。用户看视频时字幕叠加在视频底部，不遮挡主要内容。适用于：全屏看 YouTube/Bilibili 视频。

2. **拖拽模式**：用户按住悬浮窗标题栏拖动到任意位置。位置记录在 `localStorage`，刷新不丢失。适用于：字幕挡住了视频的关键按钮（如播放/暂停），需要挪开。

3. **最小化模式**：点击折叠按钮，悬浮窗缩小为 60×60px 的圆形 logo。悬浮窗变为"不打扰"状态，只在有新的 final 句子时 logo 闪烁提示。适用于：暂时不需要字幕但不想关闭监听。

**透明度设计**：20%-100% 连续可调。为什么从 20% 起而不是 0%？因为 0% 透明意味着完全不可见——用户如果误调到 0% 会以为功能坏了。20% 是最低可见度保证。为什么到 100% 而不是更高？悬浮窗不是视频播放器，不需要不透明度 > 1 的叠加效果。

**动画设计原则**：
- **入场动画**（200ms `ease-out`）：新句子从下方 10px + opacity 0 → 原位置 + opacity 1。200ms 是人眼"注意到变化"的最短舒适时间——更短会感觉突兀，更长会感觉迟钝。
- **修正闪烁**（500ms `ease-in-out`）：被修正的句子背景黄→透明。500ms 足够让用户注意到"这条变了"，但不至于长时间占据注意力。这条句子之前的内容会有一个短暂的背景高亮（约 500ms 并逐渐消失）。
- **折叠/展开**（300ms `ease-in-out`）：窗口缩放动画。300ms 平衡了视觉连续性和操作响应速度。

**标记的视觉设计**：
- 用户的 marking（星标/高亮）操作会触发简单的动画反馈。marked 条目左侧出现 ★ 星标（`text-yellow-400`），同时条目背景会有一次短暂的高亮闪烁确认操作已被接收。

**自动滚动的"智能暂停"机制**：这是悬浮窗体验的关键细节——当用户正在回看之前的字幕时，新字幕不应该"抢走"滚动位置。实现逻辑：检测 `scrollTop` 距离 `scrollHeight` 的差值 > 50px → 暂停自动滚动 → 显示"↓ 回到底部"浮动按钮 → 用户点击按钮或手动滚回底部 → 恢复自动滚动。

**实现思路**：
- **悬浮窗容器**：
  - 使用绝对定位 + z-index 浮于页面/视频上方
  - `position: fixed; bottom: 80px; right: 20px; width: 360px; max-height: 60vh`
  - 半透明背景 `bg-black/70 backdrop-blur` 实现毛玻璃效果
  - 支持鼠标拖拽移动位置（记录 `translateX/Y` offset）
  - 提供透明度滑块（20%-100%）实时调节
  - 悬浮窗可折叠为最小化图标（右下角 logo 60x60px），点击展开
- **字幕列表渲染**：
  - 使用 `VirtualList` 技术（或 `overflow-y: auto` + `scroll-behavior: smooth`）
  - 新字幕从底部淡入（`opacity 0→1` + `translateY 10px→0`，200ms transition）
  - 完整句黑色字体，进行中句子灰色斜体（`text-slate-500 italic`）
  - 修正字幕高亮闪烁：黄色背景 `bg-yellow-100` → 渐隐，500ms 动画
  - 标记重点的字幕左侧显示星标 ★
- **自动滚动行为**：
  - 每次新字幕出现，自动 `scrollTop = scrollHeight`
  - 检测用户是否手动滚离底部（距离 > 50px），是则暂停自动滚动
  - 检测用户是否滚回底部，是则恢复自动滚动
  - 用户手动滚动期间显示"↓ 回到底部"浮动按钮
- **响应式适配**：
  - 桌面端：悬浮窗宽 360px，右侧固定
  - 平板端：宽 300px，右侧固定
  - 移动端：悬浮窗切换为底部横条，占屏幕宽 100%，高度 120px

**关键文件**：
- `src/components/FloatingWindow.tsx` — 悬浮窗容器（拖拽、折叠、透明度）
- `src/components/SubtitleList.tsx` — 字幕列表（滚动、动画）
- `src/components/SubtitleItem.tsx` — 单条字幕渲染（标记、修正动画）
- `src/hooks/useAutoScroll.ts` — 自动滚动逻辑
- `src/hooks/useDrag.ts` — 拖拽 Hook

**验收标准**：
- 悬浮窗可拖拽移动，刷新页面位置不丢失（存 localStorage）
- 透明度调节即时生效
- 折叠/展开动画流畅（300ms）
- 新字幕淡入、修正高亮闪烁动画不卡顿
- 手动滚动时不自动跳底，滚回底部时恢复
- 移动端布局正常切换到横条模式

---

### PR6：字幕手动编辑 — 让用户掌控识别结果 ⬜

**目标**：允许用户在悬浮窗中直接点击字幕条目进行编辑修正。

**为什么需要手动编辑？**

PR2 的规则标点引擎和语义断句策略已经大幅提升识别质量，但任何 ASR 系统都无法做到 100% 准确。在真实演示场景中，用户需要精确的字幕记录——一个错误的标点、一个漏掉的单词，都会影响观感。手动编辑提供了直观、即时的修正入口。

**实现思路**：
- **编辑入口**：悬浮窗中每条字幕条目支持点击进入编辑模式
  - 单击字幕条目 → 条目进入编辑态，渲染为 `<textarea>` 或 `contentEditable` 区块
  - 自动聚焦，光标定位到点击位置附近
  - 编辑态显示「保存」和「取消」两个操作按钮
  - 点击条目外区域或按 `Escape` → 取消编辑，恢复原文
- **编辑保存**：
  - 用户修改后点击「保存」或按 `Enter`（`Shift+Enter` 换行）
  - 调用 `SubtitleManager` 的 `editSubtitle(id, newSourceText)` 方法更新
  - 自动重新触发翻译（若 PR3 翻译服务已启用），更新译文
  - 保留首次识别原文（`originalSourceText` 字段），`editCount` 递增
- **视觉反馈**：
  - 编辑态：条目边框变为蓝色虚线（`border-blue-400 border-dashed`），背景轻微提亮
  - 保存成功：条目短暂闪烁绿色背景（300ms `ease-out`）
  - 曾经被编辑过的条目：左侧显示 ✎ 图标，hover 时 tooltip 显示首次识别原文
- **快捷键**：
  - 双击条目 → 进入编辑模式
  - `Enter` → 保存，`Escape` → 取消

**关键文件**：
- `src/components/EditableSubtitleItem.tsx` — 可编辑字幕条目组件
- `src/types.ts` — 新增 `originalSourceText`、`editCount` 字段到 `SubtitleItem`

**验收标准**：
- 单击字幕条目进入编辑态，显示原文在输入框中
- 修改文本后保存，条目显示更新后的内容
- 取消编辑恢复原文，不做任何修改
- 已编辑条目左侧显示 ✎ 标记
- 编辑保存后自动触发翻译更新（若翻译已启用）

---

### PR7：上下文修正触发器 — 让翻译"会后悔" ⬜

**目标**：检测语义转折词，自动修正前文译文的偏差。

**为什么需要"上下文修正"？**

人类同传译员有一个关键能力：当他们意识到自己前面翻错了（因为听到了转折词），会立刻纠正。例如，听到 "I thought the answer was A, **but** it's actually B"——译员会在说出"B"后立刻把前面的"答案是 A"修正为"答案不是 A，而是 B"。

普通的逐句翻译系统没有这个能力——每句话独立翻译，"but" 后面的内容不会影响前面的译文。**上下文修正的本质是让翻译系统模仿人类同传的"回修"行为**。

**两层修正策略的设计初衷**：
- **规则引擎 v1**：无需外部 API，响应 < 1ms，适合明确转折词场景（but/however/actually 等）。例如检测到 "but"，自动对前 1-3 句译文追加"但实际上…"前缀。
- **LLM 引擎 v2**：需要调用 GPT-4o-mini，响应 500ms-2s，适合复杂语义转折（讽刺、假设语气、让步状语从句等）。V1 是 MVP 的快速路径，V2 是精致化的远期目标。

**设计决策**：
- **为什么修正范围是前 1-3 条？** 语义转折通常回溯最近 1-3 句话。回溯太多可能修正不相关的句子，回溯太少可能遗漏跨句转折。3 是基于英文演讲语料分析的黄金值。
- **为什么修正是增量更新而非整体重算？** 如果每次修正都重新翻译全部字幕，UI 会剧烈闪烁，且 LLM 开销不可控。增量修正只改 `translatedText` + `version` 字段，不影响其他条目。

**实现思路**：
- 定义转折词列表：`["but", "however", "although", "actually", "in fact", "on the contrary", "instead", "rather", "yet", "nevertheless"]`
- 每条新字幕加入后，扫描当前句是否包含转折词
- 命中转折词时，生成 `correctSubtitle` 事件回修前 1-3 条字幕
- 修正策略分两档：
  - **规则引擎 v1**：将前文译文的肯定/否定极性反转（如 "is" → "不是"、"will" → "不会"），并追加"但实际上……"等转折词
  - **LLM 引擎 v2**（架构预留）：将前 N 条字幕的原文 + 当前句原文作为 prompt 发送给 GPT-4o-mini，让它输出修正后的译文 JSON
- 修正过程不重新渲染整个列表，只更新目标条目的 `translatedText` 和 `version` 字段
- 版本号递增触发 UI 的高亮闪烁动画（PR5 已实现）

**关键文件**：
- `src/services/CorrectionTrigger.ts` — 规则引擎
- `src/services/LLMCorrectionService.ts` — LLM 修正接口（v2 预留）
- `src/types.ts` — CorrectionConfig 类型

**验收标准**：
- 说 "I think this is correct, but actually it's wrong" → 前半句译文被修正
- 修正不触发整个列表重排，仅目标条目 UI 变化
- 连续多个转折词时，每个触发独立的修正事件
- 修正版本号正确递增（version 1, 2, 3...）

---

### PR8：语音合成与导出 — 从"看"到"听"的闭环 ⬜

**目标**：TTS 朗读中文译文 + 一键导出完整字幕。

**实现思路**：
- **TTS 服务**：
  - 封装 `window.speechSynthesis` API → `TtsService` 类
  - `speak(text: string, rate: number)` 方法，rate 参数 0.5-2.0
  - 维护朗读队列，新句子入队，修正句（version > 0）不入队
  - 用户通过设置面板开关 TTS，调整语速滑块
  - 暂停监听时自动清空朗读队列
- **导出服务**：
  - `ExportService` 类提供 `exportAs(type: 'txt' | 'markdown' | 'json')` 方法
  - TXT 格式：纯文本，带时间戳行 `[HH:MM:SS] 原文 → 译文`
  - Markdown 格式：表格排版，标记重点的行加 `**粗体**` + 前缀 ⭐
  - JSON 格式：完整 `SubtitleItem[]` 数组，用于程序化处理或存档
  - 导出时触发浏览器下载（`Blob` + `URL.createObjectURL` + `<a>` click）
  - 导出文件名自动包含时间戳：`subtitles_2026-06-05_14-30-00.txt`
- **设置面板 UI**：
  - 悬浮窗右上角齿轮图标 → 弹出设置面板
  - 选项：TTS 开关、语速滑块、导出格式选择、透明度滑块
  - 设置保存到 `localStorage`，刷新页面不丢失

**关键文件**：
- `src/services/TtsService.ts` — 语音合成
- `src/services/ExportService.ts` — 字幕导出
- `src/components/SettingsPanel.tsx` — 设置面板 UI
- `src/hooks/useSettings.ts` — 设置状态管理（localStorage）

**验收标准**：
- TTS 开启时，新句子自动朗读中文，修正句不发声
- 语速调节即时生效，不中断当前朗读
- TXT/Markdown/JSON 三种格式均可正确导出
- 导出文件中标记重点的句子有明显区分（粗体/星标）
- 设置刷新页面后保持

---

### PR9：集成联调与 UI 打磨 — 从 Demo 到产品 ⬜

**目标**：打通全链路，处理边界情况，打磨最终体验。

**实现思路**：
- **全链路打通**：从麦克风 → ASR → 翻译 → 字幕管理 → 悬浮窗 UI → TTS → 导出的完整数据流串联
- **边界情况处理**：
  - WebSocket/REST 重连机制：连续 3 次 API 失败后暂停 5 秒重试
  - 长时间无语音（>60 秒）：显示"等待语音输入…"提示
  - 极快语速：智能断句的 3 秒兜底确保不丢内容
  - 空识别结果（`err_no` 非零）：静默忽略，不显示错误
  - 浏览器标签页切换：切到后台时继续采集音频（`AudioContext` 保持活跃）
- **UI 打磨**：
  - 深色主题适配：`dark:` Tailwind 变量，所有组件支持暗色模式
  - 间距统一：使用 Tailwind 的 spacing scale（`p-4`、`gap-3` 等）
  - 按钮状态：`hover:`、`active:`、`disabled:` 三态
  - 加载状态：骨架屏（Skeleton）代替 spinner
  - 动画时长统一：入场 200ms、修正 500ms、折叠 300ms
- **文档补全**：
  - README 添加实际运行截图（悬浮窗效果、识别结果）
  - 录制 30 秒演示 GIF 作为快速预览
  - 添加常见问题 FAQ 章节

**关键文件**：
- 所有现存文件的质量打磨
- `README.md` — 文档更新
- `public/demo.gif` — 演示截图

**验收标准**：
- 从前到后完整流程无阻断，从点击「开始监听」到导出字幕一气呵成
- 边界情况（无语音/快语速/断网）不崩溃，有友好提示
- 暗色模式下所有 UI 可读
- README 包含完整使用说明和截图

---

## 5. 关键设计决策

### 5.1 CORS 解决方案
所有百度 API 调用统一走 Vite 中间件代理，服务端无 CORS 限制。

### 5.2 Token 管理
- OAuth：`https://aip.baidubce.com/oauth/2.0/token`
- 缓存 30 天，避免每次识别都重新请求

### 5.3 音频格式
| 参数 | 值 |
|------|-----|
| 格式 | PCM 16-bit signed int |
| 采样率 | `AudioContext.sampleRate`（约 16000Hz） |
| dev_pid | 1737（英语） |

---

## 6. 已知问题

| 问题 | 解决 |
|------|------|
| Sandbox 阻断 Vite 端口 | PowerShell 审批通道启动 |
| PowerShell `@""@` 吞 `${}` | 用 `@''@` 或字符串拼接 |
| 百度需开通三个服务 | 短语音识别 + 实时语音识别 + 音频文件转写 |
| 浏览器 CORS | Vite 中间件代理 |

---

## 7. 后续路线

| 优先级 | 任务 |
|--------|------|
| P0 | ~~PR3: 翻译服务~~ ✅ |
| P0 | PR4+PR5: 字幕管理 + 悬浮窗 |
| P1 | PR6: 字幕手动编辑 |
| P1 | PR7: 上下文修正 |
| P1 | AudioWorklet 替换 ScriptProcessorNode |
| P2 | PR8: TTS + 导出 |
| P2 | PR9: 联调与 UI 打磨 |
| P2 | Vercel 一键部署 |