// api/chat.js
// /api/chat 端点 — Package 站 chat 统一入口
// 支持多上游 + 智能路由 + failover
// Owner: 虾 | 重写 2026-06-24 (从 DeepSeek 单源改为多源架构)

import { callWithFailover, MODEL_ROUTING } from './_lib/router.js';

const MAX_INPUT_CHARS = 8000;
const MAX_TOKENS_CAP = 4000;
const TIMEOUT_MS = 90000; // 视频/推理模型可能更慢

export default async function handler(req, res) {
  // CORS — Package 站是公开营销站，前端允许任意源
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 解析 body
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Invalid JSON' }); }
  }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return res.status(400).json({ error: 'Missing or empty messages' });
  }

  // 输入大小保护
  const totalChars = messages.reduce(
    (n, m) => n + (typeof m.content === 'string' ? m.content.length : 0),
    0
  );
  if (totalChars > MAX_INPUT_CHARS) {
    return res.status(400).json({ error: `Input too long. Max ${MAX_INPUT_CHARS} chars.` });
  }

  const requestedModel = body.model || 'deepseek-v4-flash';
  // Reasoning 模型需要更多 token — 默认给 4000
  const maxTokens = Math.min(MAX_TOKENS_CAP, Number(body.max_tokens) || 4000);

  // 用户地区（多平台兼容）
  const country =
    req.headers['x-vercel-ip-country'] ||  // Vercel
    req.headers['cf-ipcountry'] ||          // Cloudflare
    'XX';

  try {
    const { data, candidate } = await callWithFailover(requestedModel, messages, {
      maxTokens,
      temperature: body.temperature ?? 0.7,
      country,
      timeoutMs: TIMEOUT_MS,
    });

    // 如果主候还有更多备选可试，可以继续重试——但目前一个成功就返回

    const msg = data.choices?.[0]?.message;
    // Reasoning 模型 (Zhipu GLM-5.x, Kimi K2.6, etc.) 会先输出 reasoning_content，再输出 content
    // 如果 content 空但 reasoning_content 有内容，fallback 到 reasoning_content
    let out = msg?.content;
    if (!out && msg?.reasoning_content) {
      out = msg.reasoning_content;
    }
    if (!out) {
      console.error('Upstream returned no content', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'No output from model' });
    }

    return res.status(200).json({
      result: out.trim(),
      upstream: candidate.upstream,
      upstreamModel: candidate.model,
      country,
      // 成本（仅供参考）
      costUSDPerMTokens: candidate.costUSD,
    });
  } catch (e) {
    console.error('Chat error:', e.message);
    return res.status(500).json({
      error: e.message,
      requestedModel,
      country,
    });
  }
}