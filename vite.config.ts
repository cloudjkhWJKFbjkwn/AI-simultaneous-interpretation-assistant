import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { readFileSync } from "fs";
import { resolve } from "path";
import { createHash } from "crypto";

function loadEnvFromFile(): Record<string, string> {
  const root = process.cwd();
  const envPath = resolve(root, ".env");
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
      if (!process.env[key]) process.env[key] = val;
    }
    console.log("[vite] Loaded env keys:", Object.keys(env).filter(k => !k.startsWith("VITE_")).join(", "));
  } catch (e) {
    console.warn("[vite] Failed to load .env:", e);
  }
  return env;
}

const LOCAL_ENV = loadEnvFromFile();

const API_KEY = process.env.BAIDU_API_KEY || LOCAL_ENV.BAIDU_API_KEY || "";
const SECRET_KEY = process.env.BAIDU_SECRET_KEY || LOCAL_ENV.BAIDU_SECRET_KEY || "";
let cachedToken = "";
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: API_KEY,
    client_secret: SECRET_KEY,
  });
  const res = await fetch(
    "https://aip.baidubce.com/oauth/2.0/token?" + params.toString(),
    { method: "POST" }
  );
  const data = (await res.json()) as any;
  if (data.error)
    throw new Error(data.error + ": " + (data.error_description || ""));
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 2592000) * 1000;
  return cachedToken;
}

/** 百度翻译 API sign 算法 */
function baiduTranslateSign(q: string, salt: string): string {
  const appid = process.env.BAIDU_APP_ID || LOCAL_ENV.BAIDU_APP_ID || "";
  const key = process.env.BAIDU_TRANSLATE_SECRET_KEY || LOCAL_ENV.BAIDU_TRANSLATE_SECRET_KEY || "";
  const raw = appid + q + salt + key;
  return createHash("md5").update(raw).digest("hex");
}

function baiduApiPlugin() {
  return {
    name: "baidu-api-proxy",
    configureServer(server: any) {
      server.middlewares.use("/api/baidu-asr", async (req: any, res: any) => {
        try {
          const token = await getToken();
          const rate = req.headers["x-audio-rate"] || "16000";
          const url =
            "https://vop.baidu.com/server_api?" +
            new URLSearchParams({
              format: "pcm",
              rate: String(rate),
              channel: "1",
              cuid: "codex-client",
              token,
              dev_pid: "1737",
              lan: "en",
            }).toString();

          const chunks: Buffer[] = [];
          req.on("data", (c: Buffer) => chunks.push(c));
          await new Promise((r) => req.on("end", r));
          const body = Buffer.concat(chunks);

          const fetchRes = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "audio/pcm;rate=" + rate },
            body,
          });
          const data = (await fetchRes.json()) as any;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 502;
          res.end(JSON.stringify({ err_no: -1, err_msg: "Proxy: " + err.message }));
        }
      });

      server.middlewares.use("/api/baidu-token", async (_req: any, res: any) => {
        try {
          const token = await getToken();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ access_token: token }));
        } catch (err: any) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      // 百度翻译 API 代理
      server.middlewares.use("/api/baidu-translate", async (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          req.on("data", (c: Buffer) => chunks.push(c));
          await new Promise((r) => req.on("end", r));
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { q, from, to } = body;

          const appid = process.env.BAIDU_APP_ID || LOCAL_ENV.BAIDU_APP_ID;
          const salt = String(Date.now());
          const sign = baiduTranslateSign(q, salt);

          const params = new URLSearchParams({
            q, from: from || "en", to: to || "zh",
            appid: appid || "",
            salt,
            sign,
          });

          const resp = await fetch(
            "https://fanyi-api.baidu.com/api/trans/vip/translate",
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: params.toString(),
            }
          );

          const data = await resp.json();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error_code: -1, error_msg: "Proxy: " + err.message }));
        }
      });
    },
  };
}

function deepseekApiPlugin() {
  return {
    name: "deepseek-api-proxy",
    configureServer(server: any) {
      server.middlewares.use("/api/deepseek", async (req: any, res: any) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        const apiKey = process.env.DEEPSEEK_API_KEY || LOCAL_ENV.DEEPSEEK_API_KEY;
        if (!apiKey) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "DEEPSEEK_API_KEY not configured" }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          req.on("data", (c: Buffer) => chunks.push(c));
          await new Promise((r) => req.on("end", r));
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { messages } = body;

          const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": "Bearer " + apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages,
              temperature: 0.1,
              max_tokens: 300,
              stream: false,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            res.statusCode = response.status;
            res.end(JSON.stringify({ error: errText }));
            return;
          }

          const data = await response.json() as any;
          const content = data.choices?.[0]?.message?.content || "";
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ content }));
        } catch (err: any) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: "Proxy: " + err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), baiduApiPlugin(), deepseekApiPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        popup: "popup.html",
      },
    },
  },
});
