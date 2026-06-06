const https = require("https");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };

  try {
    const { messages } = JSON.parse(event.body);
    const apiKey = process.env.DEEPSEEK_API_KEY;

    const resp = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-chat", messages, temperature: 0.1, max_tokens: 300, stream: false }),
    });
    const data = await resp.json();
    return { statusCode: 200, body: JSON.stringify({ content: data.choices?.[0]?.message?.content || "" }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
