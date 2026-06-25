// api/chat.js
// /api/chat 端点 — Package 站 chat 统一入口（thin forward 到 NewAPI）
// Owner: 虾 | 2026-06-25 改版：把上游管理交给 NewAPI，Vercel Function 只做转发 + token 隐藏
//
// 配置（Vercel Dashboard → Settings → Environment Variables）：
//   NEWAPI_URL  = NewAPI 公网地址（例：http://124.220.63.115）
//   NEWAPI_KEY  = NewAPI business token（48 字符，从 /api/token/new 创建）

const MAX_INPUT_CHARS = 16000;
const TIMEOUT_MS = 60000;

// 模型 ID 映射：前端 models.json 里的 id → NewAPI 实际 model name
// 新版 NewAPI 直接认识这些真实 model 名，前端 UI 保持 marketing 名（gpt-5.4-mini）
// 注：OpenRouter 海外模型在 NewAPI 里只对 CN 区域返回 403（已实测），所以"海外账户"的 model 会自动 fail
const MODEL_MAP = {
  // OpenAI 替代（硅基流动 / 智谱）
  'gpt-5.4-mini': 'Qwen/Qwen3-235B-A22B-Instruct-2507',  // 同级别，open source，便宜
  'gpt-5.4-nano': 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
  'gpt-5.4': 'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'gpt-5.3': 'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'gpt-5': 'deepseek-ai/DeepSeek-V4-Flash',
  
  // Anthropic 替代（智谱 GLM-4 / 阶跃 step）
  'opus-4-7': 'THUDM/glm-4-9b-chat',
  'opus-4-8': 'glm-4-plus',
  'sonnet-4-5': 'glm-4-flash',
  'haiku-4-5': 'glm-4-air',
  
  // Google Gemini 替代
  'gemini-3-pro': 'baidu/ERNIE-4.5-300B-A47B',
  'gemini-3.5-flash': 'THUDM/glm-4-9b-chat',
  'gemini-3-flash': 'glm-4-flash',
  
  // DeepSeek 原生
  'deepseek-r1': 'deepseek-ai/DeepSeek-V4-Flash',
  'deepseek-v3.5': 'deepseek-ai/DeepSeek-V4-Flash',
  'deepseek-v4-flash': 'deepseek-ai/DeepSeek-V4-Flash',
  'deepseek-v4-pro': 'deepseek-ai/DeepSeek-V4-Flash',
  
  // Qwen
  'qwen3-max': 'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'qwen3-coder': 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
  'qwen3-235b': 'Qwen/Qwen3-235B-A22B-Instruct-2507',
  
  // GLM (智谱原生)
  'glm-5': 'glm-4-plus',
  'glm-4.6': 'glm-4-plus',
  'glm-4.7-flash': 'glm-4-flash',
  'glm-z1-air': 'glm-z1-air',
  'glm-z1-flash': 'glm-z1-flash',
  
  // Kimi
  'kimi-k2': 'moonshotai/Kimi-K2-Instruct',
  'kimi-k2.6': 'kimi-k2-0711-preview',
  'moonshot-v1-8k': 'moonshot-v1-8k',
  'moonshot-v1-32k': 'moonshot-v1-32k',
  'moonshot-v1-128k': 'moonshot-v1-128k',
  
  // 字节豆包（火山 endpoint 待主人建）
  'doubao-pro': 'ep-20240620-doubao-pro-32k',
  'doubao-lite': 'ep-20240620-doubao-lite-32k',
  
  // 百川
  'baichuan-4': 'Baichuan4-Turbo',
  'baichuan-4-air': 'Baichuan4-Air',
  
  // 阶跃
  'step-2': 'step-2-16k',
  'step-2-mini': 'step-2-mini',
  
  // Mistral / Llama
  'mistral-large': 'mistralai/mistral-large-latest',
  'llama-3.3-70b': 'meta-llama/llama-3.3-70b-instruct',
  
  // 直接用 NewAPI 名（passthrough）
  'deepseek-ai/DeepSeek-V4-Flash': 'deepseek-ai/DeepSeek-V4-Flash',
  'glm-4-flash': 'glm-4-flash',
  'glm-4-plus': 'glm-4-plus',
};

function resolveModel(requestedModel) {
  // 1. 直接映射
  if (MODEL_MAP[requestedModel]) return MODEL_MAP[requestedModel];
  // 2. 原样转发（如果 NewAPI 认这个 model）
  return requestedModel;
}

export default async function handler(req, res) {
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

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'Missing or empty messages' });
  }

  const totalChars = messages.reduce(
    (n, m) => n + (typeof m.content === 'string' ? m.content.length : 0),
    0
  );
  if (totalChars > MAX_INPUT_CHARS) {
    return res.status(400).json({ error: `Input too long. Max ${MAX_INPUT_CHARS} chars.` });
  }

  const requestedModel = body.model || 'deepseek-ai/DeepSeek-V4-Flash';
  const resolvedModel = resolveModel(requestedModel);

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
        model: resolvedModel,
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
        resolvedModel,
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
      resolvedModel,
      actualModel: data.model,
      country,
      usage: data.usage,
    });
  } catch (e) {
    console.error('Chat error:', e.message);
    return res.status(500).json({
      error: e.message,
      requestedModel,
      resolvedModel,
      country,
    });
  }
}
