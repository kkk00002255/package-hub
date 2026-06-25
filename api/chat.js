// api/chat.js
// /api/chat 端点 — Package 站 chat 统一入口（thin forward to NewAPI）
// Owner: 虾 | 2026-06-25 v6: 硅基流动账户实测可用 8 个 model (其他被账户 disabled)
//
// 6-25 14:53 完整测试：硅基 43 个 model 中只有 8 个 OK，25 个 disabled，8 个不存在
// 主人有余额 ¥39 + 实名认证，但账户对部分 model 限流（需要单独申请）
//
// 配置（Vercel env var）：
//   NEWAPI_URL  = NewAPI 公网地址
//   NEWAPI_KEY  = *** business token (48 字符)

const MAX_INPUT_CHARS = 16000;
const TIMEOUT_MS = 60000;

// 模型映射：前端 ID → NewAPI 实际 model name
// 实测 6-25 14:53 所有可用的 model
const MODEL_MAP = {
  // === OpenAI 系列（硅基账户用 Pro/deepseek-ai/DeepSeek-V3 或 Pro/Qwen/Qwen2.5 替代） ===
  'gpt-5.4-mini':  'Qwen/Qwen2.5-7B-Instruct',         // 快+便宜
  'gpt-5.4-nano':  'Qwen/Qwen2.5-7B-Instruct',         // 更快
  'gpt-5.4':       'Qwen/Qwen2.5-32B-Instruct',
  'gpt-5.3':       'Qwen/Qwen2.5-32B-Instruct',
  'gpt-5':         'deepseek-ai/DeepSeek-V4-Flash',     // 主力
  'gpt-5-mini':    'Qwen/Qwen2.5-7B-Instruct',
  'gpt-4o':        'Pro/deepseek-ai/DeepSeek-V3',      // 海外 model 替代
  'gpt-4o-mini':   'Pro/Qwen/Qwen2.5-7B-Instruct',
  
  // === Anthropic 系列（用智谱/百川替代） ===
  'opus-4-7':     'glm-4-plus',                        // 智谱大杯
  'opus-4-8':     'glm-4-plus',
  'sonnet-4-5':   'glm-4-flash',                       // 智谱
  'haiku-4-5':    'glm-4-air',                         // 智谱
  
  // === Google Gemini 系列（智谱/百川替代） ===
  'gemini-3-pro':     'glm-4-plus',
  'gemini-3.5-flash': 'glm-4-flash',
  'gemini-3-flash':   'glm-4-flash',
  
  // === DeepSeek 原生（硅基账户实测 OK） ===
  'deepseek-r1':       'deepseek-ai/DeepSeek-V3',      // R1 在硅基不可用，用 V3
  'deepseek-v3.5':     'deepseek-ai/DeepSeek-V3',
  'deepseek-v4-flash': 'deepseek-ai/DeepSeek-V4-Flash',  // 主力
  'deepseek-v4-pro':   'deepseek-ai/DeepSeek-V4-Flash',
  
  // === Qwen 原生（硅基账户实测 OK） ===
  'qwen3-max':     'Qwen/Qwen3-32B',
  'qwen3-coder':   'Qwen/Qwen2.5-32B-Instruct',         // Qwen3-coder 不在，用 Qwen2.5
  'qwen3-235b':    'Qwen/Qwen2.5-72B-Instruct',         // Qwen3-235B 不在，用 2.5-72B
  'qwen-3.7-max':  'Qwen/Qwen2.5-72B-Instruct',
  'qwen-3.7-plus': 'Qwen/Qwen2.5-32B-Instruct',
  'qwen-3.6-plus': 'Qwen/Qwen2.5-32B-Instruct',
  
  // === 智谱 GLM 原生 ===
  'glm-5':         'glm-4-plus',
  'glm-5.2':       'glm-4-plus',
  'glm-4.6':       'glm-4-plus',
  'glm-4.7':       'glm-4-plus',
  'glm-4.7-flash': 'glm-4-flash',
  'glm-z1-air':    'glm-z1-air',
  'glm-z1-flash':  'glm-z1-flash',
  
  // === Kimi / Moonshot ===
  'kimi-k2':       'moonshot-v1-8k',                    // Kimi K2 在 Moonshot
  'kimi-k2.6':     'moonshot-v1-8k',
  'moonshot-v1-8k':   'moonshot-v1-8k',
  'moonshot-v1-32k':  'moonshot-v1-32k',
  'moonshot-v1-128k': 'moonshot-v1-128k',
  
  // === 字节豆包（待主人建 endpoint） ===
  'doubao-pro':    'ep-20260625202629-brptr',           // 豆包 pro
  'doubao-seed-2.1-pro':  'ep-20260625202629-brptr',
  'doubao-seed-2.1-turbo': 'ep-20260625202629-brptr',
  'doubao-seed-evolving': 'ep-20260625202629-brptr',
  'doubao-pro-32k':       'ep-20260625202629-brptr',
  'doubao-lite':   'ep-20260625202629-brptr',
  'doubao-lite':   'Qwen/Qwen2.5-7B-Instruct',
  
  // === 百川 ===
  'baichuan-4':      'Baichuan4-Turbo',
  'baichuan-4-air':  'Baichuan4-Air',
  
  // === 阶跃（实测 4 个真支持） ===
  'step-2':         'step-1-8k',                         // step-2 不在硅基，用 step-1
  'step-2-mini':    'step-2-mini',
  'step-3-flash':   'step-1-8k',
  'step-3.7-flash': 'step-1-8k',
  
  // === Mimo (虾内部 model 名) ===
  'mimo-v2.5-pro':  'Qwen/Qwen2.5-72B-Instruct',
  
  // === MiniMax M 系列（虾的模型） — 实际背后是 V4 Flash ===
  'minimax-m3':     'deepseek-ai/DeepSeek-V4-Flash',
  'minimax-m2.7':   'deepseek-ai/DeepSeek-V4-Flash',
  
  // === Mistral / Llama（硅基不可用，兜底到 Qwen） ===
  'mistral-large':  'Qwen/Qwen2.5-32B-Instruct',
  'llama-3.3-70b':  'Qwen/Qwen2.5-72B-Instruct',
  
  // === Passthrough: NewAPI 认识的所有真支持 model 原样转发 ===
  'deepseek-ai/DeepSeek-V4-Flash':    'deepseek-ai/DeepSeek-V4-Flash',
  'ep-20260625202629-brptr':                 'ep-20260625202629-brptr',
  'deepseek-ai/DeepSeek-V3':          'deepseek-ai/DeepSeek-V3',
  'Qwen/Qwen3-32B':                   'Qwen/Qwen3-32B',
  'Qwen/Qwen2.5-7B-Instruct':         'Qwen/Qwen2.5-7B-Instruct',
  'Qwen/Qwen2.5-32B-Instruct':        'Qwen/Qwen2.5-32B-Instruct',
  'Qwen/Qwen2.5-72B-Instruct':        'Qwen/Qwen2.5-72B-Instruct',
  'Pro/Qwen/Qwen2.5-7B-Instruct':     'Pro/Qwen/Qwen2.5-7B-Instruct',
  'Pro/deepseek-ai/DeepSeek-V3':      'Pro/deepseek-ai/DeepSeek-V3',
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
  'Baichuan4-Turbo-128k': 'Baichuan4-Turbo-128k',
  'Baichuan4-Air-128k':   'Baichuan4-Air-128k',
  'step-1-8k':       'step-1-8k',
  'step-1-32k':      'step-1-32k',
  'step-2-mini':     'step-2-mini',
  'step-2-16k':      'step-2-16k',
  'moonshot-v1-8k':     'moonshot-v1-8k',
  'moonshot-v1-32k':    'moonshot-v1-32k',
  'moonshot-v1-128k':   'moonshot-v1-128k',
  'moonshot-v1-auto':   'moonshot-v1-auto',
  'kimi-k2-0711-preview': 'kimi-k2-0711-preview',
};

// 默认 fallback：未识别的 model → 用智谱 glm-4-flash（最稳定 + 便宜）
const DEFAULT_FALLBACK = 'glm-4-flash';

function resolveModel(requestedModel) {
  if (MODEL_MAP[requestedModel]) return MODEL_MAP[requestedModel];
  const lower = (requestedModel || '').toLowerCase();
  if (lower.includes('deepseek')) return 'deepseek-ai/DeepSeek-V4-Flash';
  if (lower.includes('qwen'))     return 'Qwen/Qwen2.5-32B-Instruct';
  if (lower.includes('glm'))      return 'glm-4-flash';
  if (lower.includes('moonshot') || lower.includes('kimi')) return 'moonshot-v1-8k';
  if (lower.includes('step'))     return 'step-1-8k';
  if (lower.includes('baichuan')) return 'Baichuan4-Turbo';
  if (lower.includes('gpt'))      return 'deepseek-ai/DeepSeek-V4-Flash';
  if (lower.includes('claude') || lower.includes('opus') || lower.includes('sonnet')) return 'glm-4-flash';
  if (lower.includes('gemini'))   return 'glm-4-flash';
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
