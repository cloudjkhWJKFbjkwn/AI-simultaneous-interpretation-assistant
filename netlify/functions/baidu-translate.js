// Netlify Function: ??????
const crypto = require("crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
  try {
    const { q, from, to } = JSON.parse(event.body);
    const appid = process.env.BAIDU_APP_ID;
    const key = process.env.BAIDU_TRANSLATE_SECRET_KEY;
    const salt = String(Date.now());
    const sign = crypto.createHash("md5").update(appid + q + salt + key).digest("hex");

    const params = new URLSearchParams({ q, from: from || "en", to: to || "zh", appid, salt, sign });
    const resp = await fetch("https://fanyi-api.baidu.com/api/trans/vip/translate", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString(),
    });
    return { statusCode: 200, body: JSON.stringify(await resp.json()) };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error_code: -1, error_msg: e.message }) };
  }
};
