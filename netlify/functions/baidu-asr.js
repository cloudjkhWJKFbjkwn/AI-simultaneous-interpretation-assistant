// Netlify Function: ?? ASR ??
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  try {
    const apiKey = process.env.BAIDU_API_KEY;
    const secretKey = process.env.BAIDU_SECRET_KEY;
    if (!apiKey || !secretKey) throw new Error("Missing Baidu API credentials");

    // Get token
    const tokenParams = new URLSearchParams({ grant_type: "client_credentials", client_id: apiKey, client_secret: secretKey });
    const tokenRes = await fetch("https://aip.baidubce.com/oauth/2.0/token?" + tokenParams.toString(), { method: "POST" });
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) throw new Error("Token failed: " + JSON.stringify(tokenData));

    // Decode base64 audio
    const { audio } = JSON.parse(event.body);
    const body = Buffer.from(audio, "base64");
    const rate = event.headers["x-audio-rate"] || "16000";

    const url = "https://vop.baidu.com/server_api?" + new URLSearchParams({
      format: "pcm", rate, channel: "1", cuid: "netlify-client", token, dev_pid: "1737", lan: "en",
    }).toString();

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "audio/pcm;rate=" + rate, "Content-Length": String(body.length) },
      body,
    });

    return { statusCode: 200, body: JSON.stringify(await resp.json()) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ err_no: -1, err_msg: e.message }) };
  }
};
