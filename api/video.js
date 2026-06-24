// api/video.js
// /api/video 端点 — Package 站视频生成统一入口
// Owner: 虾 | 2026-06-24

import { generateVideo } from './_lib/multimodal.js';

const MAX_PROMPT_LEN = 2000;

// 默认参数：5 秒视频（适配 Vercel Function 60s 超时）
// Vercel Hobby plan 60s 超时，Pro 300s
// 5s 视频 ~30-60s 可跑通，10s 视频 ~60-120s 可能超时，20s 视频 ~120-180s 必超时
const DEFAULT_FRAMES = 60;   // 5 秒 @ 12fps
const DEFAULT_FPS = 12;
const MAX_FRAMES_Hobby = 120; // 10 秒上限（Hobby）
const MAX_FRAMES_Pro = 480;   // 40 秒上限（Pro）

// 根据 Vercel plan 限制 max frames
const isProPlan = process.env.VERCEL_PLAN === 'pro';
const MAX_FRAMES = isProPlan ? MAX_FRAMES_Pro : MAX_FRAMES_Hobby;

const MODEL_ROUTING = {
  // I2V（图生视频）作为默认 — 主人主要用例是"把生成的图变成视频"
  'wanxiang-vid': [
    { upstream: 'siliconflow', model: 'Wan-AI/Wan2.2-I2V-A14B', costUSD: 4, note: '通义万相 Wan 2.2 I2V（图生视频，需输入图）' },
  ],
  // 纯文生视频作为备选
  'wanxiang-vid-ext': [
    { upstream: 'siliconflow', model: 'Wan-AI/Wan2.2-T2V-A14B', costUSD: 4, note: '通义万相 Wan 2.2 T2V（文生视频，无图时可用）' },
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

  // I2V（图生视频）需要输入图
  const inputImage = body.image || body.image_url;
  if (!inputImage && candidates.some(c => c.model.includes('I2V'))) {
    return res.status(400).json({ error: 'Image-to-video requires an input image. Please upload or generate an image first.' });
  }

  res.setHeader('Cache-Control', 'no-cache');

  // 参数：用户可传 duration (秒) 或 frames (具体值)
  // 默认 5 秒 (60 frames × 12 fps)
  let frames;
  if (body.duration && !body.frames) {
    // duration 秒 → frames
    const duration = Math.max(3, Math.min(isProPlan ? 40 : 10, Number(body.duration) || 5));
    frames = Math.round(duration * DEFAULT_FPS);
  } else {
    frames = Math.min(MAX_FRAMES, Math.max(16, Number(body.frames) || DEFAULT_FRAMES));
  }
  const fps = Math.min(24, Math.max(8, Number(body.fps) || DEFAULT_FPS));
  const seconds = Math.round((frames / fps) * 10) / 10;

  const errors = [];
  for (const candidate of candidates) {
    try {
      const result = await generateVideo(candidate.model, prompt, {
        image: inputImage, // I2V 需要输入图（URL 或 base64）
        size: body.size || '1280x720',
        frames,
        fps,
        // 视频生成慢：20s 视频约 90-180s，轮询间隔 10s + 30 次 = 300s 上限
        pollIntervalMs: 10000,
        maxPollAttempts: 30,
      });
      return res.status(200).json({
        ...result,
        requestedModel,
        candidateUpstream: candidate.upstream,
        candidateModel: candidate.model,
        seconds,
        frames,
      });
    } catch (e) {
      errors.push({ candidate, error: e.message });
    }
  }

  return res.status(500).json({
    error: `All video upstreams failed for "${requestedModel}": ${errors.map(e => e.error).join(' | ')}`,
  });
}