// api/image.js
// /api/image 端点 — Package 站图像生成统一入口
// Owner: 虾 | 2026-06-24

import { generateImage } from './_lib/multimodal.js';

const MAX_PROMPT_LEN = 4000;
const MAX_N = 4;
const ALLOWED_SIZES = ['512x512', '768x768', '1024x1024', '1024x1792', '1792x1024'];

const MODEL_ROUTING = {
  // Banana series — Tongyi 通义 (硅基流动开源版)
  'banana-2': [
    { upstream: 'siliconflow', model: 'Tongyi-MAI/Z-Image-Turbo', costUSD: 0.2, note: '通义 Z-Image Turbo 开源版' },
  ],
  'banana-pro': [
    { upstream: 'siliconflow', model: 'Tongyi-MAI/Z-Image', costUSD: 0.3, note: '通义 Z-Image 高质量版' },
  ],
  // Wanxiang Image (阿里通义万相)
  'wanxiang-2.7': [
    { upstream: 'siliconflow', model: 'Tongyi-MAI/Z-Image', costUSD: 0.3, note: '通义 Z-Image（替代通义万相）' },
    { upstream: 'siliconflow', model: 'Kwai-Kolors/Kolors', costUSD: 0.2, note: '快手 Kolors 备选' },
  ],
  // Qwen Image (Qwen 图像理解)
  'qwen-image': [
    { upstream: 'siliconflow', model: 'Qwen/Qwen-Image-Edit', costUSD: 0.5, note: 'Qwen Image 编辑' },
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

  const requestedModel = body.model || 'banana-2';
  const candidates = MODEL_ROUTING[requestedModel];
  if (!candidates || candidates.length === 0) {
    return res.status(400).json({ error: `Model "${requestedModel}" is not available for image generation yet` });
  }

  const size = ALLOWED_SIZES.includes(body.size) ? body.size : '1024x1024';
  const n = Math.min(MAX_N, Math.max(1, Number(body.n) || 1));

  const errors = [];
  for (const candidate of candidates) {
    try {
      const result = await generateImage(candidate.model, prompt, { size, n });
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
    error: `All image upstreams failed for "${requestedModel}": ${errors.map(e => e.error).join(' | ')}`,
  });
}