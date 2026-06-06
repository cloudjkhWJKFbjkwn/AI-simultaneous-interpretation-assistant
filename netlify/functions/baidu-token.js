// Netlify Function: ?? Token
exports.handler = async () => {
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;
  if (!apiKey || !secretKey) return { statusCode: 500, body: JSON.stringify({ error: "Missing Baidu keys" }) };

  const params = new URLSearchParams({ grant_type: "client_credentials", client_id: apiKey, client_secret: secretKey });
  try {
    const res = await fetch("https://aip.baidubce.com/oauth/2.0/token?" + params.toString(), { method: "POST" });
    const data = await res.json();
    return { statusCode: 200, body: JSON.stringify({ access_token: data.access_token }) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
