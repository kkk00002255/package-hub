// api/diag.js — 在 Vercel Function 里直接测每个 upstream 调用
// Owner: 虾 | 2026-06-25 | Debug only

import { UPSTREAMS, callUpstream } from './_lib/upstreams.js';

const UPSTREAM_TESTS = [
  { name: 'zhipu', model: 'glm-4-flash' },
  { name: 'stepfun', model: 'step-1-8k' },
  { name: 'siliconflow', model: 'Qwen/Qwen3.5-35B-A3B' },
  { name: 'hunyuan', model: 'hunyuan-turbo' },
  { name: 'baichuan', model: 'Baichuan4-Turbo' },
  { name: 'openrouter', model: 'openai/gpt-oss-120b:free' },
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const results = [];

  for (const { name, model } of UPSTREAM_TESTS) {
    const cfg = UPSTREAMS[name];
    const key = cfg.getKey();
    const result = {
      upstream: name,
      model,
      keyConfigured: !!key,
      keyLength: key ? key.length : 0,
    };

    if (!key) {
      result.status = 'skipped';
      result.error = 'API key not configured';
      results.push(result);
      continue;
    }

    try {
      const t0 = Date.now();
      const data = await callUpstream(name, model, [{role: 'user', content: 'hi'}], {
        maxTokens: 10,
        timeoutMs: 15000,
      });
      result.status = 'success';
      result.latencyMs = Date.now() - t0;
      result.output = data.choices?.[0]?.message?.content?.trim().slice(0, 30) || '(empty)';
    } catch (e) {
      result.status = 'failed';
      result.latencyMs = 0;
      result.error = e.message?.slice(0, 300);
    }

    results.push(result);
  }

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    vercelEnv: process.env.VERCEL_ENV,
    results,
    summary: {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    },
  });
}