# 馃帣锔?AI 鍚屽０浼犺瘧鍔╂墜 (Web Demo)

> 娴忚鍣ㄧ瀹炴椂鑻辨枃璇煶璇嗗埆 + 涓枃缈昏瘧宸ュ叿锛岄€傜敤浜庤鐪嬭嫳鏂囨紨璁层€佹妧鏈垎浜拰鍦ㄧ嚎璇剧▼銆?
## 馃彈锔?鏋舵瀯

```
楹﹀厠椋?鈫?AudioCapture (PCM 16kHz) 鈫?闊抽噺妫€娴嬫柇鍙?    鈫?SpeechRecognitionService 鈫?/api/baidu-asr (Vite 浠ｇ悊)
    鈫?鐧惧害鐭闊宠瘑鍒?REST API 鈫?璇箟鏂彞
    鈫?TranslationService 鈫?SubtitleContext (useReducer 鐘舵€佹満)
    鈫?瀹炴椂涓嫳鍙岃瀛楀箷灞曠ず锛堝彲鏍囪閲嶇偣銆佽嚜鍔ㄤ慨姝ｏ級
```

## 馃殌 蹇€熷紑濮?
```bash
# 1. 瀹夎渚濊禆
npm install

# 2. 閰嶇疆鐧惧害 AI 瀵嗛挜
cp .env.example .env
# 缂栬緫 .env 濉叆 BAIDU_API_KEY 鍜?BAIDU_SECRET_KEY
# 闇€鍦ㄧ櫨搴?AI 鎺у埗鍙板紑閫氾細鐭闊宠瘑鍒€佸疄鏃惰闊宠瘑鍒?
# 3. 鍚姩寮€鍙戞湇鍔″櫒
npm run dev

# 4. 鎵撳紑 http://localhost:5173
```

### 缈昏瘧绛栫暐

| 绛栫暐 | 璇存槑 | 閰嶇疆 |
|------|------|------|
| `mock` | 鏈湴璇嶅吀缈昏瘧锛堥粯璁わ級锛屾棤闇€ API锛岄浂寤惰繜 | `VITE_TRANSLATION_STRATEGY=mock` |
| `baidu` | 鐧惧害鏂囨湰缈昏瘧 API锛屾瘡鏈堝厤璐?50 涓囧瓧绗?| `VITE_TRANSLATION_STRATEGY=baidu` + `BAIDU_APP_ID` |

### Vercel 閮ㄧ讲

```bash
npx vercel --prod
```
鐜鍙橀噺: `BAIDU_API_KEY`, `BAIDU_SECRET_KEY`, `VITE_TRANSLATION_STRATEGY`

## 馃 鏂彞绛栫暐

- **闊抽噺妫€娴?*: 鍋滈】 ~1 绉掕嚜鍔ㄥ垏鍓查煶棰戝彂閫?- **瀹氭椂鍏滃簳**: 鏈€闀?3 绉掑己鍒跺彂閫?- **璇箟鏂彞**: 璇嗗埆缁撴灉鎸夋爣鐐圭鍙?+ 闀垮害鏅鸿兘鍒嗗彞

## 馃幀 瀛楀箷绠＄悊

- **`useReducer` 鐘舵€佹満**锛氬師瀛愬寲鎿嶄綔 `add` / `correct` / `toggleMark` / `clear`锛屼笉瑙﹀彂鏃犲叧鏉＄洰閲嶆覆鏌?- **`SubtitleContext`**锛氬叏灞€瀛楀箷涓婁笅鏂囷紝璺ㄧ粍浠跺叡浜瓧骞曠姸鎬侊紝閬垮厤 props drilling
- **鏍囪閲嶇偣**锛氱偣鍑诲瓧骞曞崱鐗囧垏鎹㈡槦鏍?鈽咃紝瀵煎嚭鏃堕珮浜樉绀?- **鐗堟湰杩借釜**锛氫慨姝ｈ瘧鏂囨椂閫掑 `version` 瀛楁锛屾敮鎸佸悗缁笂涓嬫枃淇
- **涓婇檺淇濇姢**锛氭渶澶氫繚鐣?500 鏉″瓧骞曪紝瓒呭嚭鑷姩娓呯悊鏈€鏃╂潯鐩?
## 馃敡 鎶€鏈爤

React 19 + TypeScript + Vite 8 路 Tailwind CSS v4 路 鐧惧害 AI 鐭闊宠瘑鍒?路 鐧惧害鏂囨湰缈昏瘧 API 路 Vercel Serverless

## 馃搧 椤圭洰缁撴瀯

```
src/
鈹溾攢鈹€ App.tsx                            # 涓荤晫闈紙鍙岃瀛楀箷鍗＄墖 + 鏍囪浜や簰锛?鈹溾攢鈹€ context/
鈹?  鈹斺攢鈹€ SubtitleContext.tsx            # 鍏ㄥ眬瀛楀箷涓婁笅鏂?Provider
鈹溾攢鈹€ hooks/
鈹?  鈹溾攢鈹€ useSpeechRecognition.ts        # 璇煶璇嗗埆 + 缈昏瘧鐘舵€佺鐞?鈹?  鈹斺攢鈹€ useSubtitleManager.ts         # useReducer 瀛楀箷鐘舵€佹満
鈹溾攢鈹€ types.ts                           # 绫诲瀷瀹氫箟
鈹斺攢鈹€ services/
    鈹溾攢鈹€ AudioCapture.ts                # 楹﹀厠椋?+ PCM 閲囬泦
    鈹溾攢鈹€ SpeechRecognitionService.ts    # 鐧惧害 ASR 瀹㈡埛绔?    鈹溾攢鈹€ PunctuationService.ts          # 鏍囩偣琛ュ叏寮曟搸
    鈹溾攢鈹€ TranslationService.ts          # 缈昏瘧鏈嶅姟宸ュ巶 + LRU 缂撳瓨
    鈹溾攢鈹€ MockTranslationService.ts      # 鏈湴璇嶅吀缈昏瘧锛?00+ 璇嶆眹锛?    鈹斺攢鈹€ BaiduTranslationService.ts     # 鐧惧害缈昏瘧 API 瀹㈡埛绔?api/
鈹斺攢鈹€ baidu-token.ts                     # Vercel Token 浠ｇ悊
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
| PR10 | FloatingWindow — 专注模式（自动隐藏 UI） | ✅ codex/pr9-floating-window |
| PR11 | 字幕手动编辑 | ⬜ 待开发 |
| PR12 | TTS 语音合成 | ⬜ 待开发 |
| PR13 | 字幕导出 | ⬜ 待开发 |
| PR14 | 设置面板 | ⬜ 待开发 |
| PR15 | 上下文修正 | ⬜ 待开发 |
| PR16 | 集成联调与 UI 打磨 | ⬜ 待开发 |
