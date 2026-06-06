import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import crypto from 'crypto'

const API_KEY = 'hQaxRjnhJ6wean4FCAqdSP84';
const SECRET_KEY = 'vOFTi1baGB3cmDpynsXfK4d9HdLFgy08';
const TRANSLATE_APP_ID = 'Q5Hd_d8hc0g70sfpjfm4rr170';
let cachedToken = '';
let tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const params = new URLSearchParams({ grant_type: 'client_credentials', client_id: API_KEY, client_secret: SECRET_KEY });
  const res = await fetch('https://aip.baidubce.com/oauth/2.0/token?' + params.toString(), { method: 'POST' });
  const data = await res.json() as any;
  if (data.error) throw new Error(data.error + ': ' + (data.error_description || ''));
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in || 2592000) * 1000;
  return cachedToken;
}

function baiduApiPlugin() {
  return {
    name: 'baidu-api-proxy',
    configureServer(server: any) {
      // 百度翻译 API 代理
      server.middlewares.use('/api/dict', async (req: any, res: any) => {
        try {
          const word = req.url?.replace('/api/dict/', '').split('?')[0] || '';
          const fetchRes = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word));
          const data = await fetchRes.json();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: 'Proxy: ' + err.message }));
        }
      });

      server.middlewares.use('/api/baidu-translate', async (req: any, res: any) => {
        try {
          let body = '';
          req.on('data', (c: string) => body += c);
          await new Promise(r => req.on('end', r));
          const { q, from, to } = JSON.parse(body);

          const salt = String(Math.floor(Math.random() * 10000000000));
          const sign = crypto.createHash('md5').update(TRANSLATE_APP_ID + q + salt + SECRET_KEY).digest('hex');

          const params = new URLSearchParams({
            q, from: from || 'en', to: to || 'zh',
            appid: TRANSLATE_APP_ID, salt, sign,
          });

          const fetchRes = await fetch('https://fanyi-api.baidu.com/api/trans/vip/translate?' + params.toString());
          const data = await fetchRes.json() as any;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: 'Proxy: ' + err.message }));
        }
      });

      server.middlewares.use('/api/baidu-token', async (_req: any, res: any) => {
        try {
          const token = await getToken();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ access_token: token }));
        } catch (err: any) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      server.middlewares.use('/api/baidu-asr', async (req: any, res: any) => {
        try {
          const token = await getToken();
          const rate = req.headers['x-audio-rate'] || '16000';
          const url = 'https://vop.baidu.com/server_api?' + new URLSearchParams({
            format: 'pcm', rate: String(rate), channel: '1', cuid: 'codex-client',
            token, dev_pid: '1737', lan: 'en',
          }).toString();

          const chunks: Buffer[] = [];
          req.on('data', (c: Buffer) => chunks.push(c));
          await new Promise(r => req.on('end', r));
          const body = Buffer.concat(chunks);

          console.log('[ASR Proxy] rate=' + rate + ' body=' + body.length + ' bytes');

          const fetchRes = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'audio/pcm;rate=' + rate }, body });
          const data = await fetchRes.json() as any;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch (err: any) {
          res.statusCode = 502;
          res.end(JSON.stringify({ err_no: -1, err_msg: 'Proxy: ' + err.message }));
        }
      });
    },
  };
}

export default defineConfig({ plugins: [react(), tailwindcss(), baiduApiPlugin()] })

