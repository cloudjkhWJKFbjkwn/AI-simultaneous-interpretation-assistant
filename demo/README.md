# 🎬 Demo 演示

## 在线预览


🔗 **在线地址**：[ai-simultaneous-interpretation.netlify.app](https://ai-simultaneous-interpretation.netlify.app)

在线运行的识别速度较慢，需要耐心等待



## 本地运行
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

### 已知问题

- ASR 函数中 Netlify 对二进制音频的编码方式与本地 Vite 代理不同，可能导致识别报错
- 同时使用Netlify的线上网站，在识别速度上和本地有明显差距。

---

## 📹 演示视频

> [B站演示视频](https://www.bilibili.com/video/BV1YnEs66EKn)
