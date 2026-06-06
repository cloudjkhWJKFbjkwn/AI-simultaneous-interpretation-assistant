/**
 * Vercel Serverless: 百度文本翻译代理
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash } from "crypto";

function sign(q: string, salt: string): string {
  const appid = process.env.BAIDU_APP_ID || "";
  const key = process.env.BAIDU_TRANSLATE_SECRET_KEY || "";
  return createHash("md5").update(appid + q + salt + key).digest("hex");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { q, from, to } = req.body;
    const appid = process.env.BAIDU_APP_ID;
    if (!appid) return res.status(500).json({ error: "BAIDU_APP_ID not configured" });

    const salt = String(Date.now());
    const params = new URLSearchParams({
      q, from: from || "en", to: to || "zh",
      appid, salt, sign: sign(q, salt),
    });

    const resp = await fetch("https://fanyi-api.baidu.com/api/trans/vip/translate", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await resp.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error_code: -1, error_msg: "Proxy: " + err.message });
  }
}
