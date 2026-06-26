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
const STREAM_FIRST_TOKEN_MS = 8000; // 流式首 token 超时（看到首字就用这么久）
const DEFAULT_MAX_TOKENS = 2000;    // 2026-06-26 虾: 8000→2000 避免长输出撞 60s abort
const HARD_MAX_TOKENS = 4000;       // 客户端可以请求更高，但硬上限 4000

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

  // 流式开关：客户端可发 stream: true 请求流式响应（SSE）
  // 流式体验：第一 token 8s 限时，整体仍受 TIMEOUT_MS 60s 兜底
  const stream = body.stream === true;

  // max_tokens 默认 2000（6-26 虾下调）— 8000 太容易撞 60s abort
  const requestedMax = Number(body.max_tokens) || DEFAULT_MAX_TOKENS;
  const maxTokens = Math.min(HARD_MAX_TOKENS, Math.max(64, requestedMax));

  try {
    const controller = new AbortController();
    let timeoutId = null;
    timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const upstreamResp = await fetch(`${NEWAPI_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEWAPI_KEY}`,
      },
      body: JSON.stringify({
        model: resolvedModel,
        messages,
        max_tokens: maxTokens,
        temperature: body.temperature ?? 0.7,
        stream,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!upstreamResp.ok) {
      // 上游 HTTP 错误 — 透传状态码 + 详细错误
      let errPayload = {};
      try { errPayload = await upstreamResp.json(); } catch {}
      const errMsg = errPayload.error?.message || `Upstream HTTP ${upstreamResp.status}`;
      console.error('NewAPI HTTP error:', upstreamResp.status, errMsg);
      return res.status(upstreamResp.status).json({
        error: errMsg,
        kind: 'upstream',
        requestedModel,
        resolvedModel,
        country,
      });
    }

    // === 流式分支：把上游 SSE 原样转给前端 + 首 token 限时 ===
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no'); // 关 nginx buffering

      const reader = upstreamResp.body.getReader();
      const decoder = new TextDecoder();
      let firstTokenTimer = setTimeout(() => {
        // 首 token 超时 — 主动关流，返回错误 chunk
        controller.abort();
        res.write(`data: ${JSON.stringify({ error: 'First token timeout', kind: 'first_token_timeout' })}\n\n`);
        res.end();
      }, STREAM_FIRST_TOKEN_MS);

      try {
        // 把首 token 计时器在拿到第一个非空 chunk 时清掉
        let sawFirstToken = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!sawFirstToken) {
            const chunk = decoder.decode(value, { stream: true });
            if (chunk.includes('"content"') && /"content"\s*:\s*"[^"]+/.test(chunk)) {
              sawFirstToken = true;
              clearTimeout(firstTokenTimer);
            }
          }
          res.write(value);
        }
        clearTimeout(firstTokenTimer);
        res.end();
        return;
      } catch (streamErr) {
        clearTimeout(firstTokenTimer);
        console.error('Stream error:', streamErr.message);
        try { res.end(); } catch {}
        return;
      }
    }

    // === 非流式分支 ===
    const data = await upstreamResp.json();

    if (data.error) {
      console.error('NewAPI error:', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({
        error: data.error?.message || 'Upstream error',
        kind: 'upstream',
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
      return res.status(502).json({ error: 'No output from model', kind: 'empty' });
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
    if (timeoutId) clearTimeout(timeoutId);
    const isAbort = e.name === 'AbortError' || /aborted/i.test(e.message);
    console.error('Chat error:', e.message);
    return res.status(isAbort ? 504 : 500).json({
      error: isAbort
        ? `Request timed out after ${Math.round(TIMEOUT_MS / 1000)}s — the model took too long to respond. Try a faster model (Qwen2.5-7B-Instruct) or shorter prompt.`
        : e.message,
      kind: isAbort ? 'timeout' : 'server',
      requestedModel,
      resolvedModel,
      country,
    });
  }
}
