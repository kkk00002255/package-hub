// api/chat.js
// /api/chat 端点 — Package 站 chat 统一入口（thin forward 到 NewAPI）
// Owner: 虾 | 2026-06-25 改版：把上游管理交给 NewAPI，Vercel Function 只做转发 + token 隐藏
//
// 配置（Vercel Dashboard → Settings → Environment Variables）：
//   NEWAPI_URL  = NewAPI 公网地址（例：http://124.220.63.115）
//   NEWAPI_KEY  = NewAPI business token（48 字符，从 /api/token/new 创建）

const MAX_INPUT_CHARS = 16000;  // 比之前更大（NewAPI 上限）
const TIMEOUT_MS = 60000;       // 60s 超时（NewAPI 内含 failover）

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const NEWAPI_URL = process.env.NEWAPI_URL;
  const NEWAPI_KEY = process.env.NEWAPI_KEY;
  if (!NEWAPI_URL || !NEWAPI_KEY) {
    console.error('Missing NEWAPI_URL or NEWAPI_KEY env var');
    return res.status(500).json({ error: 'Server misconfigured (missing NewAPI env)' });
  }

  // 解析 body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'Missing or empty messages' });
  }

  // 输入大小保护
  const totalChars = messages.reduce(
    (n, m) => n + (typeof m.content === 'string' ? m.content.length : 0),
    0
  );
  if (totalChars > MAX_INPUT_CHARS) {
    return res.status(400).json({ error: `Input too long. Max ${MAX_INPUT_CHARS} chars.` });
  }

  const requestedModel = body.model || 'deepseek-ai/DeepSeek-V4-Flash';

  // 用户地区（多平台兼容）
  const country =
    req.headers['x-vercel-ip-country'] ||
    req.headers['cf-ipcountry'] ||
    req.headers['x-country'] ||
    'CN';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const upstreamResp = await fetch(`${NEWAPI_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEWAPI_KEY}`,
      },
      body: JSON.stringify({
        model: requestedModel,
        messages,
        max_tokens: Math.min(8000, Number(body.max_tokens) || 4000),
        temperature: body.temperature ?? 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await upstreamResp.json();

    if (!upstreamResp.ok || data.error) {
      console.error('NewAPI error:', JSON.stringify(data).slice(0, 500));
      return res.status(upstreamResp.status).json({
        error: data.error?.message || 'Upstream error',
        requestedModel,
        country,
      });
    }

    const msg = data.choices?.[0]?.message;
    let out = msg?.content;
    if (!out && msg?.reasoning_content) {
      out = msg.reasoning_content;
    }
    if (!out) {
      console.error('NewAPI returned no content', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'No output from model' });
    }

    return res.status(200).json({
      result: out.trim(),
      requestedModel,
      actualModel: data.model,
      country,
      // 新版：NewAPI 已自动选最佳上游，前端不用知道
      usage: data.usage,
    });
  } catch (e) {
    console.error('Chat error:', e.message);
    return res.status(500).json({
      error: e.message,
      requestedModel,
      country,
    });
  }
}
