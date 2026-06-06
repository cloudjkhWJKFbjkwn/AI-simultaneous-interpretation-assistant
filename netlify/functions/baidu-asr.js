// Netlify Function: 百度 ASR 代理
const crypto = require("crypto");

async function getToken() {
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;
  const params = new URLSearchParams({ grant_type: "client_credentials", client_id: apiKey, client_secret: secretKey });
  const res = await fetch("https://aip.baidubce.com/oauth/2.0/token?" + params.toString(), { method: "POST" });
  const data = await res.json();
  return data.access_token;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const token = await getToken();
    const rate = event.headers["x-audio-rate"] || "16000";
    const body = Buffer.from(event.body, "base64");
    const url = "https://vop.baidu.com/server_api?" + new URLSearchParams({
      format: "pcm", rate, channel: "1", cuid: "netlify-client", token, dev_pid: "1737", lan: "en",
    }).toString();
    const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "audio/pcm;rate=" + rate }, body });
    return { statusCode: 200, body: JSON.stringify(await resp.json()) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ err_no: -1, err_msg: e.message }) };
  }
};
