// api/chat.js
// /api/chat 端点 — Package 站 chat 统一入口（thin forward to NewAPI）
// Owner: 虾 | 2026-06-25 v3: 扩展 MODEL_MAP + 加智能 fallback
//
// 配置（Vercel Dashboard → Environment Variables）：
//   NEWAPI_URL  = NewAPI 公网地址
//   NEWAPI_KEY  = NewAPI business token (48 字符)

const MAX_INPUT_CHARS = 16000;
const TIMEOUT_MS = 60000;

// 模型映射：前端 ID → NewAPI 实际 model name
// 涵盖 6-25 13:00 时前端 13 个 live chat model + 营销热门名字
const MODEL_MAP = {
  // === OpenAI 系列（替代品） ===
  'gpt-5.4-mini': 'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'gpt-5.4-nano': 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
  'gpt-5.4':      'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'gpt-5.3':      'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'gpt-5':        'deepseek-ai/DeepSeek-V4-Flash',
  'gpt-5-mini':   'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'gpt-4o':       'openai/gpt-4o',
  'gpt-4o-mini':  'openai/gpt-4o-mini',
  
  // === Anthropic 系列（替代品） ===
  'opus-4-7':     'THUDM/glm-4-9b-chat',
  'opus-4-8':     'glm-4-plus',
  'sonnet-4-5':   'glm-4-flash',
  'haiku-4-5':    'glm-4-air',
  
  // === Google Gemini 系列（替代品） ===
  'gemini-3-pro':     'baidu/ERNIE-4.5-300B-A47B',
  'gemini-3.5-flash': 'THUDM/glm-4-9b-chat',
  'gemini-3-flash':   'glm-4-flash',
  
  // === DeepSeek 原生 ===
  'deepseek-r1':       'deepseek-ai/DeepSeek-V4-Flash',
  'deepseek-v3.5':     'deepseek-ai/DeepSeek-V4-Flash',
  'deepseek-v4-flash': 'deepseek-ai/DeepSeek-V4-Flash',
  'deepseek-v4-pro':   'deepseek-ai/DeepSeek-V4-Flash',
  
  // === Qwen 原生 ===
  'qwen3-max':   'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'qwen3-coder': 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
  'qwen3-235b':  'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'qwen-3.7-max':   'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'qwen-3.7-plus':  'Qwen/Qwen3-Coder-480B-A35B-Instruct',
  'qwen-3.6-plus':  'Qwen/Qwen3-235B-A22B-Instruct-2507',
  
  // === 智谱 GLM 原生 ===
  'glm-5':        'glm-4-plus',
  'glm-5.2':      'glm-4-plus',
  'glm-4.6':      'glm-4-plus',
  'glm-4.7':      'glm-4-plus',
  'glm-4.7-flash':'glm-4-flash',
  'glm-z1-air':   'glm-z1-air',
  'glm-z1-flash': 'glm-z1-flash',
  
  // === Kimi / Moonshot ===
  'kimi-k2':      'moonshotai/Kimi-K2-Instruct',
  'kimi-k2.6':    'kimi-k2-0711-preview',
  'moonshot-v1-8k':   'moonshot-v1-8k',
  'moonshot-v1-32k':  'moonshot-v1-32k',
  'moonshot-v1-128k': 'moonshot-v1-128k',
  
  // === 字节豆包（火山 endpoint 待主人建）===
  'doubao-pro':  'ep-20240620-doubao-pro-32k',
  'doubao-lite': 'ep-20240620-doubao-lite-32k',
  
  // === 百川 ===
  'baichuan-4':     'Baichuan4-Turbo',
  'baichuan-4-air': 'Baichuan4-Air',
  
  // === 阶跃 ===
  'step-2':        'step-2-16k',
  'step-2-mini':   'step-2-mini',
  'step-3-flash':  'step-1-8k',
  'step-3.7-flash':'step-1-8k',
  
  // === Mimo ===
  'mimo-v2.5-pro':  'Qwen/Qwen3-235B-A22B-Instruct-2507',
  
  // === MiniMax M 系列（虾的模型） ===
  'minimax-m3':     'deepseek-ai/DeepSeek-V4-Flash',
  'minimax-m2.7':   'deepseek-ai/DeepSeek-V4-Flash',
  
  // === Mistral / Llama ===
  'mistral-large':  'mistralai/mistral-large-latest',
  'llama-3.3-70b':  'meta-llama/llama-3.3-70b-instruct',
  
  // === Passthrough: NewAPI 认识的所有 model 原样转发 ===
  'deepseek-ai/DeepSeek-V4-Flash': 'deepseek-ai/DeepSeek-V4-Flash',
  'Qwen/Qwen3-235B-A22B-Instruct-2507': 'Qwen/Qwen3-235B-A22B-Instruct-2507',
  'Qwen/Qwen3-Coder-480B-A35B-Instruct': 'Qwen/Qwen3-Coder-480B-A35B-Instruct',
  'THUDM/glm-4-9b-chat': 'THUDM/glm-4-9b-chat',
  'glm-4-flash': 'glm-4-flash',
  'glm-4-plus':  'glm-4-plus',
  'glm-4-air':   'glm-4-air',
  'glm-4-long':  'glm-4-long',
  'glm-4-airx':  'glm-4-airx',
  'glm-4-flashx':'glm-4-flashx',
  'glm-z1-air':  'glm-z1-air',
  'glm-z1-flash':'glm-z1-flash',
  'glm-4v':      'glm-4v',
  'glm-4v-plus': 'glm-4v-plus',
  'Baichuan4-Turbo': 'Baichuan4-Turbo',
  'Baichuan4-Air':   'Baichuan4-Air',
  'step-1-8k':       'step-1-8k',
  'step-1-flash':    'step-1-flash',
  'step-2-16k':      'step-2-16k',
  'step-2-mini':     'step-2-mini',
};

// 默认 fallback：未识别的 model → 用这个稳定的（便宜快）
const DEFAULT_FALLBACK = 'glm-4-flash';

function resolveModel(requestedModel) {
  // 1. 直接映射
  if (MODEL_MAP[requestedModel]) return MODEL_MAP[requestedModel];
  // 2. 模糊匹配（按系列）
  const lower = (requestedModel || '').toLowerCase();
  if (lower.includes('deepseek')) return 'deepseek-ai/DeepSeek-V4-Flash';
  if (lower.includes('qwen'))     return 'Qwen/Qwen3-235B-A22B-Instruct-2507';
  if (lower.includes('glm'))      return 'glm-4-flash';
  if (lower.includes('moonshot') || lower.includes('kimi')) return 'moonshot-v1-8k';
  if (lower.includes('step'))     return 'step-1-flash';
  if (lower.includes('baichuan')) return 'Baichuan4-Turbo';
  if (lower.includes('gpt'))      return 'deepseek-ai/DeepSeek-V4-Flash';
  if (lower.includes('claude') || lower.includes('opus') || lower.includes('sonnet')) return 'glm-4-flash';
  if (lower.includes('gemini'))   return 'glm-4-flash';
  // 3. 默认
  return DEFAULT_FALLBACK;
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
