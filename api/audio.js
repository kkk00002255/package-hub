// api/audio.js
// /api/audio 端点 — Package 站语音生成（TTS）统一入口
// Owner: 虾 | 2026-06-24

import { generateAudio } from './_lib/multimodal.js';

const MAX_TEXT_LEN = 5000;

const MODEL_ROUTING = {
  // 豆包 TTS — 字节火山是首选；硅基流动 fnlp/MOSS-TTSD-v0.5 备选
  'doubao-tts-2': [
    { upstream: 'siliconflow', model: 'FunAudioLLM/CosyVoice2-0.5B', costUSD: 0.1, note: '阿里 CosyVoice 2 中文 TTS' },
  ],
  'gemini-3.1-tts': [
    { upstream: 'siliconflow', model: 'FunAudioLLM/CosyVoice2-0.5B', costUSD: 0.1, note: '阿里 CosyVoice 2 多语言' },
  ],
  // Suno 音乐 — 实际是音乐生成，暂未接
  'suno-4.5': [
    { upstream: 'siliconflow', model: 'fnlp/MOSS-TTSD-v0.5', costUSD: 0.5, note: 'MOSS TTS（仅文字转语音，非音乐）' },
  ],
  'suno-4.5-instrumental': [
    { upstream: 'siliconflow', model: 'fnlp/MOSS-TTSD-v0.5', costUSD: 0.5, note: 'MOSS TTS fallback' },
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

  const text = (body?.text || body?.prompt || '').trim();
  if (!text) return res.status(400).json({ error: 'Missing text/prompt' });
  if (text.length > MAX_TEXT_LEN) return res.status(400).json({ error: `Text too long (max ${MAX_TEXT_LEN} chars)` });

  const requestedModel = body.model || 'doubao-tts-2';
  const candidates = MODEL_ROUTING[requestedModel];
  if (!candidates || candidates.length === 0) {
    return res.status(400).json({ error: `Model "${requestedModel}" is not available for audio generation yet` });
  }

  const errors = [];
  for (const candidate of candidates) {
    try {
      const result = await generateAudio(candidate.model, text, {
        voice: body.voice || 'alloy',
        format: body.format || 'mp3',
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
    error: `All audio upstreams failed for "${requestedModel}": ${errors.map(e => e.error).join(' | ')}`,
  });
}