// Vercel Serverless Function — DeepSeek chat proxy for Package hub
// Env: DEEPSEEK_API_KEY_PACKAGE (Production/Preview/Dev)
// Body: { messages: [{role, content}, ...], model?: string, max_tokens?: number }
// Returns: { result: string } or { error: string }

const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const MAX_INPUT_CHARS = 8000;        // protect from huge payloads
const MAX_TOKENS_CAP = 4000;
const TIMEOUT_MS = 45000;            // reasoning models can take ~30s

export default async function handler(req, res) {
  // CORS — open for the deployed frontend (Package is a public marketing site)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // parse body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const messages = Array.isArray(body && body.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'Missing or empty messages' });
  }

  // rough size guard
  const totalChars = messages.reduce((n, m) => n + (typeof m.content === 'string' ? m.content.length : 0), 0);
  if (totalChars > MAX_INPUT_CHARS) {
    return res.status(400).json({ error: `Input too long. Max ${MAX_INPUT_CHARS} chars.` });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY_PACKAGE;
  if (!apiKey) {
    console.error('DEEPSEEK_API_KEY_PACKAGE not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // Whitelist: only the two real DeepSeek models may hit the upstream.
  // All other model IDs (GPT-5.5, Claude Opus, etc.) are UI-only mock entries.
  const ALLOWED_MODELS = ['deepseek-v4-flash', 'deepseek-v4-pro'];
  const requestedModel = (body && body.model) || 'deepseek-v4-flash';
  if (!ALLOWED_MODELS.includes(requestedModel)) {
    return res.status(400).json({
      error: `Model "${requestedModel}" is not available in this build. Only ${ALLOWED_MODELS.join(', ')} are wired to a real upstream.`
    });
  }
  const model = requestedModel;
  const maxTokens = Math.min(MAX_TOKENS_CAP, Number(body && body.max_tokens) || 2000);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const r = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        // reasoning models: stream=false so we wait for full response
        stream: false,
        max_tokens: maxTokens,
        temperature: 0.7
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!r.ok) {
      const errText = await r.text();
      console.error('DeepSeek upstream error', r.status, errText.slice(0, 500));
      return res.status(502).json({ error: `Upstream error (${r.status})` });
    }

    const data = await r.json();
    const msg = data.choices && data.choices[0] && data.choices[0].message;
    const out = msg && msg.content;
    if (!out) {
      console.error('DeepSeek returned no content', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'No output from model' });
    }

    return res.status(200).json({ result: out.trim() });
  } catch (e) {
    clearTimeout(timeout);
    let detail = 'Internal error';
    if (e && e.name === 'AbortError') detail = `Timeout (${TIMEOUT_MS / 1000}s — reasoning model can take a while)`;
    else if (e && e.message) detail = `Internal error (${e.name}: ${e.message.slice(0, 100)})`;
    console.error('Handler exception:', detail);
    return res.status(500).json({ error: detail });
  }
}