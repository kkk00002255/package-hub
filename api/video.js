// api/video.js
// /api/video 端点 — Package 站视频生成统一入口
// Owner: 虾 | 2026-06-24

import { generateVideo } from './_lib/multimodal.js';

const MAX_PROMPT_LEN = 2000;

const MODEL_ROUTING = {
  'wanxiang-vid': [
    { upstream: 'siliconflow', model: 'Wan-AI/Wan2.2-T2V-A14B', costUSD: 2, note: '通义万相 Wan 2.2 T2V' },
  ],
  'wanxiang-vid-ext': [
    { upstream: 'siliconflow', model: 'Wan-AI/Wan2.2-I2V-A14B', costUSD: 2, note: '通义万相 Wan 2.2 I2V（图生视频）' },
  ],
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const prompt = (body?.prompt || '').trim();
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
  if (prompt.length > MAX_PROMPT_LEN) return res.status(400).json({ error: `Prompt too long (max ${MAX_PROMPT_LEN} chars)` });

  const requestedModel = body.model || 'wanxiang-vid';
  const candidates = MODEL_ROUTING[requestedModel];
  if (!candidates || candidates.length === 0) {
    return res.status(400).json({ error: `Model "${requestedModel}" is not available for video generation yet` });
  }

  // Vercel Function 默认 10s，免费版 Hobby plan 最长 60s
  // 视频生成可能需要更长时间，先设长一些
  res.setHeader('Cache-Control', 'no-cache');

  const errors = [];
  for (const candidate of candidates) {
    try {
      const result = await generateVideo(candidate.model, prompt, {
        size: body.size || '1280x720',
        frames: body.frames || 16,
        fps: body.fps || 16,
        // 如果硅基流动视频生成是同步接口，会立即返回；异步接口会轮询
        pollIntervalMs: 5000,
        maxPollAttempts: 12, // 60s 上限
      });
      return res.status(200).json({
        ...result,
        requestedModel,
        candidateUpstream: candidate.upstream,
        candidateModel: candidate.model,
      });
    } catch (e) {
      errors.push({ candidate, error: e.message });
    }
  }

  return res.status(500).json({
    error: `All video upstreams failed for "${requestedModel}": ${errors.map(e => e.error).join(' | ')}`,
  });
}