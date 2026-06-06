# 🎬 Demo 演示

## 在线预览

> ⚠️ Netlify 部署为静态演示页面，**不支持实时语音识别**（API 代理基于本地 Vite 中间件，Netlify Functions 暂未完全适配）。

🔗 **在线地址**：[ai-simultaneous-interpretation.netlify.app](https://ai-simultaneous-interpretation.netlify.app)

在线版可以体验：
- 🎨 界面浏览（亮色/暗色模式切换）
- 🪟 悬浮字幕窗
- 📤 字幕导出功能
- ✏️ 字幕编辑交互

---

## 完整功能演示（本地运行）

完整功能需要本地运行（语音识别 + LLM 纠错 + 实时翻译）：

```bash
git clone https://github.com/cloudjkhWJKFbjkwn/AI-simultaneous-interpretation-assistant.git
cd AI-simultaneous-interpretation-assistant
cp .env.example .env
npm install
npm run dev
```

### 配置 .env

编辑 `.env`，填入以下 5 个密钥（注册链接见 README）：

```
BAIDU_API_KEY=xxx
BAIDU_SECRET_KEY=xxx
BAIDU_APP_ID=xxx
BAIDU_TRANSLATE_SECRET_KEY=xxx
DEEPSEEK_API_KEY=sk-xxx
VITE_TRANSLATION_STRATEGY=baidu
VITE_BAIDU_APP_ID=xxx    # 与 BAIDU_APP_ID 相同
```

然后打开 `http://localhost:5173` 即可体验完整功能。

---

## 🌐 Netlify 部署（高级）

> ⚠️ Netlify 部署涉及 Serverless Functions 配置，需要一定技术基础。

### 步骤

1. **Fork 本仓库** 到自己的 GitHub
2. 打开 [Netlify.com](https://netlify.com)，GitHub 登录
3. **Add new site → Import an existing project** → 选择仓库
4. 构建设置：Build command = `npx vite build`，Publish directory = `dist`
5. **Site settings → Environment variables** 添加 7 个变量：
   - `BAIDU_API_KEY`, `BAIDU_SECRET_KEY`, `BAIDU_APP_ID`
   - `BAIDU_TRANSLATE_SECRET_KEY`, `DEEPSEEK_API_KEY`
   - `VITE_TRANSLATION_STRATEGY=baidu`, `VITE_BAIDU_APP_ID`
6. 将 4 个敏感变量标记为 **Contains secret values**
7. **Deploy project without cache**

### 已知问题

- ASR 函数中 Netlify 对二进制音频的编码方式与本地 Vite 代理不同，可能导致识别报错
- 建议先本地运行确认功能正常，再尝试线上部署

---

## 📹 演示视频

> 待上传
