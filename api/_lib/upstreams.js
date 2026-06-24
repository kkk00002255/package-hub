// api/_lib/upstreams.js
// 多源上游适配器 — 每个上游一个标准 OpenAI ChatCompletion adapter
// Owner: 虾 | Created: 2026-06-24 | License: 私有

/**
 * 上游池（owner 可随时加新的，按 "找一个最便宜最稳定的源头" 原则）
 * region: 'CN' = 国内直连 | 'GLOBAL' = 海外 | 'CN_SLOW' = 国内可访问但慢
 */
export const UPSTREAMS = {
  siliconflow: {
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    region: 'CN',
    costLevel: 1, // 1=最便宜, 2=中等, 3=贵
    latencyMs: 80,
    getKey: () => process.env.SILICONFLOW_API_KEY,
  },
  zhipu: {
    name: 'Zhipu',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    region: 'CN',
    costLevel: 2,
    latencyMs: 120,
    getKey: () => process.env.ZHIPU_API_KEY,
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    region: 'GLOBAL',
    costLevel: 3,
    latencyMs: 800, // 国内访问 300-800ms
    getKey: () => process.env.OPENROUTER_API_KEY,
    extraHeaders: () => ({
      'HTTP-Referer': 'https://package-hub-kkk00002255.vercel.app',
      'X-Title': 'Package Hub',
    }),
  },
  volcengine: {
    name: 'Volcengine',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    region: 'CN',
    costLevel: 2,
    latencyMs: 100,
    getKey: () => process.env.VOLCENGINE_API_KEY,
    // 字节火山需要 endpoint ID 当 model，不是模型名
    requiresEndpointId: true,
  },
  moonshot: {
    name: 'Moonshot',
    baseUrl: 'https://api.moonshot.cn/v1',
    region: 'CN',
    costLevel: 2,
    latencyMs: 150,
    getKey: () => process.env.MOONSHOT_API_KEY,
  },
  // 新增 3 家便宜上游（2026-06-24 补充）
  hunyuan: {
    name: 'Hunyuan',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    region: 'CN',
    costLevel: 1,
    latencyMs: 120,
    getKey: () => process.env.HUNYUAN_API_KEY,
  },
  baichuan: {
    name: 'Baichuan',
    baseUrl: 'https://api.baichuan-ai.com/v1',
    region: 'CN',
    costLevel: 1,
    latencyMs: 130,
    getKey: () => process.env.BAICHUAN_API_KEY,
  },
  stepfun: {
    name: 'StepFun',
    baseUrl: 'https://api.stepfun.com/v1',
    region: 'CN',
    costLevel: 1,
    latencyMs: 110,
    getKey: () => process.env.STEPFUN_API_KEY,
  },
};

export class UpstreamError extends Error {
  constructor(upstream, status, message) {
    super(`[${upstream}] HTTP ${status}: ${message}`);
    this.upstream = upstream;
    this.status = status;
    this.name = 'UpstreamError';
  }
}

/**
 * 统一调用上游 ChatCompletion
 * @param {string} upstreamName - siliconflow / zhipu / openrouter / volcengine / moonshot
 * @param {string} model - 上游模型 ID (或 endpoint ID for volcengine)
 * @param {Array} messages - OpenAI 格式 messages
 * @param {Object} opts - { maxTokens, temperature, timeoutMs, signal }
 * @returns {Promise<Object>} 上游 OpenAI 响应
 */
export async function callUpstream(upstreamName, model, messages, opts = {}) {
  const upstream = UPSTREAMS[upstreamName];
  if (!upstream) {
    throw new Error(`Unknown upstream: ${upstreamName}`);
  }
  const apiKey = upstream.getKey();
  if (!apiKey) {
    throw new UpstreamError(upstreamName, 0, `API key not configured`);
  }

  const controller = new AbortController();
  const timeoutMs = opts.timeoutMs || 60000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  
  // 合并 signal（Vercel/请求中止）
  if (opts.signal) {
    opts.signal.addEventListener('abort', () => controller.abort());
  }

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
  // OpenRouter 需要 referer headers
  if (upstream.extraHeaders) {
    Object.assign(headers, upstream.extraHeaders());
  }

  try {
    const r = await fetch(`${upstream.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens || 2000,
        temperature: opts.temperature ?? 0.7,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!r.ok) {
      const errText = await r.text();
      throw new UpstreamError(upstreamName, r.status, errText.slice(0, 500));
    }

    return await r.json();
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof UpstreamError) throw e;
    if (e.name === 'AbortError') {
      throw new UpstreamError(upstreamName, 0, `Timeout after ${timeoutMs}ms`);
    }
    throw new UpstreamError(upstreamName, 0, e.message || String(e));
  }
}

/**
 * 检查上游是否已配置（key 存在）
 */
export function getAvailableUpstreams() {
  return Object.entries(UPSTREAMS)
    .filter(([_, u]) => u.getKey())
    .map(([name, _]) => name);
}