/**
 * Vercel Serverless: 获取百度 AI access_token
 *
 * 环境变量:
 *   BAIDU_API_KEY     - 百度 AI API Key
 *   BAIDU_SECRET_KEY  - 百度 AI Secret Key
 */

export async function GET(): Promise<Response> {
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;

  if (!apiKey || !secretKey) {
    return Response.json(
      { error: 'Missing BAIDU_API_KEY or BAIDU_SECRET_KEY environment variables' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: apiKey,
    client_secret: secretKey,
  });
  const url = 'https://aip.baidubce.com/oauth/2.0/token?' + params.toString();

  try {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json() as { access_token?: string; error?: string; error_description?: string };

    if (data.error) {
      return Response.json(
        { error: 'Baidu OAuth error: ' + data.error + ' - ' + (data.error_description || 'unknown') },
        { status: 401 }
      );
    }

    return Response.json({
      access_token: data.access_token,
      expires_in: 2592000,
    });
  } catch (err) {
    return Response.json(
      { error: 'Token request failed: ' + (err as Error).message },
      { status: 502 }
    );
  }
}
