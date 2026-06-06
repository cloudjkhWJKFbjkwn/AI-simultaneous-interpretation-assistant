// Netlify Function: ?? ASR ??
const crypto = require("crypto");

async function getToken() {
  console.log("[baidu-asr] Getting token with key:", process.env.BAIDU_API_KEY?.slice(0, 6) + "...");
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;
  if (!apiKey || !secretKey) throw new Error("Missing Baidu API credentials");
  const params = new URLSearchParams({ grant_type: "client_credentials", client_id: apiKey, client_secret: secretKey });
  const res = await fetch("https://aip.baidubce.com/oauth/2.0/token?" + params.toString(), { method: "POST" });
  const data = await res.json();
  if (!data.access_token) throw new Error("Token failed: " + JSON.stringify(data));
  return data.access_token;
}

exports.handler = async (event) => {
  console.log("[baidu-asr] Request received, method:", event.httpMethod);
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  try {
    const token = await getToken();
    const rate = event.headers["x-audio-rate"] || "16000";
    const contentType = event.headers["content-type"] || "";

    // Netlify encodes binary body as base64
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : Buffer.from(event.body);

    console.log("[baidu-asr] Audio size:", body.length, "bytes, rate:", rate);

    const url = "https://vop.baidu.com/server_api?" + new URLSearchParams({
      format: "pcm", rate, channel: "1", cuid: "netlify-client", token, dev_pid: "1737", lan: "en",
    }).toString();

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "audio/pcm;rate=" + rate, "Content-Length": String(body.length) },
      body,
    });

    const data = await resp.json();
    console.log("[baidu-asr] Baidu response:", JSON.stringify(data).slice(0, 200));

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (e) {
    console.error("[baidu-asr] Error:", e.message);
    return { statusCode: 502, body: JSON.stringify({ err_no: -1, err_msg: e.message }) };
  }
};
