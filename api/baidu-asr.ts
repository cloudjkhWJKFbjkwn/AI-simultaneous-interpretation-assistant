/**
 * Vercel Serverless: 百度短语音识别代理
 * 客户端 POST 音频数据 → 转发到百度 ASR API
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

async function getToken(): Promise<string> {
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error("Missing BAIDU_API_KEY or BAIDU_SECRET_KEY");

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: apiKey,
    client_secret: secretKey,
  });
  const res = await fetch("https://aip.baidubce.com/oauth/2.0/token?" + params.toString(), { method: "POST" });
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error + ": " + data.error_description);
  return data.access_token;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const token = await getToken();
    const rate = (req.headers["x-audio-rate"] as string) || "16000";

    // 读取原始音频数据
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    await new Promise((r) => req.on("end", r));
    const body = Buffer.concat(chunks);

    const url =
      "https://vop.baidu.com/server_api?" +
      new URLSearchParams({
        format: "pcm", rate, channel: "1", cuid: "vercel-client",
        token, dev_pid: "1737", lan: "en",
      }).toString();

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "audio/pcm;rate=" + rate, "Content-Length": String(body.length) },
      body,
    });

    const data = await resp.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ err_no: -1, err_msg: "Proxy: " + err.message });
  }
}

export const config = {
  maxDuration: 30,
};
