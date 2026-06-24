// api/_lib/router.js
// 智能路由 — 57 个 model 卡片 → 候选上游池（按价格 + 区域 + 可用性自动选）
// 核心原则：每个 model 列出多个候选上游，按"最便宜且稳定"自动选择
// Owner: 虾 | 2026-06-24

import { callUpstream, UpstreamError, UPSTREAMS } from './upstreams.js';

/**
 * 路由配置 — 每个 model 卡片 → 多个候选上游
 * candidate 字段:
 *   upstream: 'siliconflow' / 'zhipu' / 'openrouter' / 'volcengine' / 'moonshot'
 *   model: 上游实际模型 ID (字节火山是 endpoint ID)
 *   costUSD: 每 1M token 平均成本 (USD, 用于排序; 0 = 免费)
 *   priority: 1-N 数字越小优先级越高 (同 cost 时使用)
 *   note: 提示信息
 *
 * 用户地区决策:
 *   - 国内 (CN) 用户: 国内上游优先 (硅基流动 > 智谱 > 字节 > 月之暗面 > OpenRouter)
 *   - 海外用户: OpenRouter 优先 > 国内上游
 *   - 如果首选上游不可用 (key 缺失), 自动 failover 到下一个
 */
export const MODEL_ROUTING = {
  // ============================ Chat 类别 ============================
  'gpt-5.5': {
    candidates: [
      { upstream: 'openrouter', model: 'openai/gpt-5.5', costUSD: 17.5, priority: 1, note: '海外账户可用，国内受限' },
    ],
    status: 'overseas', // 国内账户不能用，等海外账户
  },
  'gpt-5.5-deep': {
    candidates: [
      { upstream: 'openrouter', model: 'openai/o3-deep-research', costUSD: 25, priority: 1 },
    ],
    status: 'overseas',
  },
  'gpt-5.5-high': {
    candidates: [
      { upstream: 'openrouter', model: 'openai/o3-pro', costUSD: 50, priority: 1 },
    ],
    status: 'overseas',
  },
  'gpt-5.4-mini': {
    candidates: [
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.5-35B-A3B', costUSD: 0.4, priority: 1, note: '替代品：Qwen3.5-35B 同级别，更便宜' },
    ],
    status: 'live',
    note: 'OpenAI 账户地区限制无法接入；用 Qwen3.5-35B 替代（性价比更高）',
  },
  'gpt-5.4-nano': {
    candidates: [
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.5-9B', costUSD: 0.2, priority: 1, note: '替代品：Qwen3.5-9B 更小更快' },
    ],
    status: 'live',
    note: 'OpenAI 账户地区限制无法接入；用 Qwen3.5-9B 替代',
  },
  'opus-4-7': {
    candidates: [
      { upstream: 'openrouter', model: 'anthropic/claude-opus-4.5', costUSD: 15, priority: 1 },
    ],
    status: 'overseas',
  },
  'opus-4-8': {
    candidates: [
      { upstream: 'openrouter', model: 'anthropic/claude-opus-4.8', costUSD: 15, priority: 1 },
    ],
    status: 'overseas',
  },
  'sonnet-4-5': {
    candidates: [
      { upstream: 'openrouter', model: 'anthropic/claude-sonnet-4.5', costUSD: 9, priority: 1 },
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.5-122B-A10B', costUSD: 0.7, priority: 2, note: '开源替代' },
    ],
    status: 'live',
    note: '海外账户走 OpenRouter；国内账户 fallback 到 Qwen3.5-122B',
  },
  'gemini-3-pro': {
    candidates: [
      { upstream: 'openrouter', model: 'google/gemini-3.1-pro-preview', costUSD: 7, priority: 1 },
    ],
    status: 'overseas',
  },
  'gemini-3.5-flash': {
    candidates: [
      { upstream: 'openrouter', model: 'google/gemini-3.1-flash-lite', costUSD: 0.875, priority: 1 },
    ],
    status: 'overseas',
  },
  'deepseek-v4-pro': {
    candidates: [
      { upstream: 'siliconflow', model: 'Pro/deepseek-ai/DeepSeek-V3.2', costUSD: 2, priority: 1, note: 'Pro 镜像' },
      { upstream: 'zhipu', model: 'glm-5.2', costUSD: 0.5, priority: 2, note: '智谱 GLM 5.2 同级别替代' },
      { upstream: 'volcengine', model: '__DEEPSEEK_V4_PRO_ENDPOINT__', costUSD: 1.5, priority: 3, note: '字节火山镜像，待 endpoint' },
      { upstream: 'openrouter', model: 'openai/gpt-oss-120b:free', costUSD: 0, priority: 4, note: 'OpenRouter 免费 fallback' },
    ],
    status: 'live',
    note: 'DeepSeek 官方账户被封；多源 failover',
  },
  'deepseek-v4-flash': {
    candidates: [
      { upstream: 'siliconflow', model: 'deepseek-ai/DeepSeek-V4-Flash', costUSD: 0.7, priority: 1 },
      { upstream: 'zhipu', model: 'glm-4.5-air', costUSD: 0.3, priority: 2, note: '智谱 GLM 4.5 Air 快速模型替代' },
      { upstream: 'volcengine', model: '__DEEPSEEK_V4_FLASH_ENDPOINT__', costUSD: 0.5, priority: 3, note: '字节火山镜像，待 endpoint' },
      { upstream: 'siliconflow', model: 'Pro/deepseek-ai/DeepSeek-V3.2', costUSD: 2, priority: 4, note: 'Pro 备选' },
      { upstream: 'openrouter', model: 'openai/gpt-oss-120b:free', costUSD: 0, priority: 5, note: 'OpenRouter 免费 fallback' },
    ],
    status: 'live',
    note: '主力模型，多源 failover',
  },
  'qwen-3.7-max': {
    candidates: [
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.5-397B-A17B', costUSD: 1.5, priority: 1, note: 'Qwen 旗舰' },
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.6-35B-A3B', costUSD: 0.6, priority: 2, note: '上一代 max 备选' },
      { upstream: 'zhipu', model: 'glm-5.2', costUSD: 0.5, priority: 3, note: '智谱 GLM 5.2 备选' },
      { upstream: 'moonshot', model: 'kimi-k2.6', costUSD: 1, priority: 4, note: 'Moonshot Kimi K2.6 备选' },
    ],
    status: 'live',
  },
  'qwen-3.7-plus': {
    candidates: [
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.5-122B-A10B', costUSD: 0.7, priority: 1 },
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.6-27B', costUSD: 0.4, priority: 2 },
      { upstream: 'zhipu', model: 'glm-5.1', costUSD: 0.4, priority: 3, note: '智谱 GLM 5.1 备选' },
    ],
    status: 'live',
  },
  'qwen-3.6-plus': {
    candidates: [
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.5-35B-A3B', costUSD: 0.4, priority: 1 },
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.6-27B', costUSD: 0.4, priority: 2 },
      { upstream: 'zhipu', model: 'glm-4.7', costUSD: 0.4, priority: 3, note: '智谱 GLM 4.7 备选' },
    ],
    status: 'live',
  },
  'glm-5.2': {
    candidates: [
      { upstream: 'zhipu', model: 'glm-5.2', costUSD: 0.5, priority: 1, note: '智谱官方最便宜' },
      { upstream: 'siliconflow', model: 'zai-org/GLM-5.2', costUSD: 0.6, priority: 2, note: '硅基流动镜像' },
      { upstream: 'volcengine', model: '__GLM_5_2_ENDPOINT__', costUSD: 0.5, priority: 3, note: '字节火山镜像，待 endpoint' },
      { upstream: 'moonshot', model: 'moonshot-v1-128k', costUSD: 1, priority: 4, note: 'Moonshot 备选' },
      { upstream: 'openrouter', model: 'qwen/qwen3-next-80b-a3b-instruct:free', costUSD: 0, priority: 5, note: 'OR 免费 fallback' },
    ],
    status: 'live',
    note: '多源 failover，价格差不多',
  },
  'step-3.7-flash': {
    candidates: [
      { upstream: 'stepfun', model: 'step-1-8k', costUSD: 0.2, priority: 1, note: '阶跃星辰 step-1-8k（首选）' },
      { upstream: 'siliconflow', model: 'stepfun-ai/Step-3.5-Flash', costUSD: 0.2, priority: 2, note: '硛基流动 Step 镜像' },
      { upstream: 'zhipu', model: 'glm-4-flash', costUSD: 0.1, priority: 3, note: '智谱 GLM 4 Flash 备选' },
      { upstream: 'hunyuan', model: 'hunyuan-turbo', costUSD: 0.5, priority: 4, note: '腾讯混元' },
      { upstream: 'baichuan', model: 'Baichuan4-Turbo', costUSD: 0.6, priority: 5, note: '百川 4 Turbo' },
      { upstream: 'openrouter', model: 'liquid/lfm-2.5-1.2b-instruct:free', costUSD: 0, priority: 6, note: 'OR 免费 fallback' },
    ],
    status: 'live',
    note: '多源 failover（6 上游）',
  },
  'mimo-v2.5-pro': {
    candidates: [
      { upstream: 'siliconflow', model: 'inclusionAI/Ling-flash-2.0', costUSD: 0.3, priority: 1, note: '小米 mimo 同级别替代' },
      { upstream: 'hunyuan', model: 'hunyuan-turbo', costUSD: 0.5, priority: 2, note: '腾讯混元' },
      { upstream: 'stepfun', model: 'step-1-8k', costUSD: 0.2, priority: 3, note: '阶跃星辰' },
      { upstream: 'baichuan', model: 'Baichuan4-Turbo', costUSD: 0.6, priority: 4, note: '百川 4 Turbo' },
      { upstream: 'siliconflow', model: 'MiniMaxAI/MiniMax-M2.5', costUSD: 0.4, priority: 5, note: 'MiniMax 同级别' },
      { upstream: 'openrouter', model: 'openai/gpt-oss-120b:free', costUSD: 0, priority: 6, note: 'OR 免费 fallback' },
    ],
    status: 'live',
  },
  'minimax-m3': {
    candidates: [
      { upstream: 'siliconflow', model: 'MiniMaxAI/MiniMax-M2.5', costUSD: 0.4, priority: 1, note: 'MiniMax 系列' },
      { upstream: 'zhipu', model: 'glm-5.2', costUSD: 0.5, priority: 2, note: '智谱 GLM 5.2 备选' },
      { upstream: 'hunyuan', model: 'hunyuan-turbo', costUSD: 0.5, priority: 3, note: '腾讯混元' },
      { upstream: 'stepfun', model: 'step-1-8k', costUSD: 0.5, priority: 4, note: '阶跃星辰' },
      { upstream: 'baichuan', model: 'Baichuan4-Turbo', costUSD: 0.6, priority: 5, note: '百川 4 Turbo' },
      { upstream: 'volcengine', model: '__MINIMAX_M2_5_ENDPOINT__', costUSD: 0.4, priority: 6, note: '字节火山镜像，待 endpoint' },
      { upstream: 'openrouter', model: 'openai/gpt-oss-120b:free', costUSD: 0, priority: 7, note: 'OR 免费 fallback' },
    ],
    status: 'live',
    note: '默认模型，多源 failover（8 个上游）',
  },
  'minimax-m2.7': {
    candidates: [
      { upstream: 'siliconflow', model: 'MiniMaxAI/MiniMax-M2.5', costUSD: 0.4, priority: 1, note: '上一代同系列' },
      { upstream: 'zhipu', model: 'glm-4.7', costUSD: 0.4, priority: 2, note: '智谱备选' },
      { upstream: 'openrouter', model: 'openai/gpt-oss-120b:free', costUSD: 0, priority: 3, note: 'OR 免费 fallback' },
    ],
    status: 'live',
  },
  'grok-4.20': {
    candidates: [
      { upstream: 'openrouter', model: 'x-ai/grok-4.20', costUSD: 1.875, priority: 1 },
    ],
    status: 'overseas',
  },
  'grok-4.3': {
    candidates: [
      { upstream: 'openrouter', model: 'x-ai/grok-4.3', costUSD: 1.875, priority: 1 },
    ],
    status: 'overseas',
  },

  // ============================ Image 类别 ============================
  'banana-2': {
    candidates: [
      { upstream: 'siliconflow', model: 'Tongyi-MAI/Z-Image-Turbo', costUSD: 0, priority: 1, note: '开源图像，硅基流动免费' },
    ],
    status: 'live',
    note: '开源替代；真 banana 2 待字节火山 endpoint',
  },
  'banana-pro': {
    candidates: [
      { upstream: 'siliconflow', model: 'Tongyi-MAI/Z-Image', costUSD: 0, priority: 1 },
    ],
    status: 'live',
  },
  'gpt-image-2': {
    candidates: [
      { upstream: 'openrouter', model: 'openai/gpt-image-1', costUSD: 5, priority: 1, note: '海外' },
    ],
    status: 'overseas',
  },
  'gpt-image-2-pro': {
    candidates: [
      { upstream: 'openrouter', model: 'openai/gpt-image-1.5', costUSD: 10, priority: 1 },
    ],
    status: 'overseas',
  },
  'vidu-image-2': {
    candidates: [],
    status: 'coming-soon',
  },
  'wanxiang-2.7': {
    candidates: [
      { upstream: 'siliconflow', model: 'Tongyi-MAI/Z-Image', costUSD: 0.3, priority: 1, note: '通义万相（接 /api/image）' },
      { upstream: 'siliconflow', model: 'Kwai-Kolors/Kolors', costUSD: 0.2, priority: 2, note: '快手 Kolors 备选' },
    ],
    status: 'live',
    note: '图像生成已接 /api/image',
  },
  'qwen-image': {
    candidates: [
      { upstream: 'siliconflow', model: 'Qwen/Qwen3-VL-32B-Instruct', costUSD: 1, priority: 1, note: 'Qwen VL 系列支持图像理解' },
    ],
    status: 'live',
  },

  // ============================ Video 类别 ============================
  'sora-2': {
    candidates: [
      { upstream: 'openrouter', model: 'openai/sora-2', costUSD: 50, priority: 1, note: '海外' },
    ],
    status: 'overseas',
  },
  'veo-3.1': {
    candidates: [
      { upstream: 'openrouter', model: 'google/veo-3.1', costUSD: 30, priority: 1 },
    ],
    status: 'overseas',
  },
  'veo-3.1-lite': {
    candidates: [
      { upstream: 'openrouter', model: 'google/veo-3.1-flash', costUSD: 5, priority: 1 },
    ],
    status: 'overseas',
  },
  'kling-2.6': {
    candidates: [],
    status: 'coming-soon',
    note: '快手 Kling，国内可走但未在已配置上游中',
  },
  'vidu-q3-turbo': { candidates: [], status: 'coming-soon' },
  'vidu-q3-ref': { candidates: [], status: 'coming-soon' },
  'pix-c1-ref': { candidates: [], status: 'coming-soon' },
  'pix-c1-fl': { candidates: [], status: 'coming-soon' },
  'wanxiang-vid': {
    candidates: [
      { upstream: 'siliconflow', model: 'Wan-AI/Wan2.2-T2V-A14B', costUSD: 2, priority: 1, note: '通义万相 Wan 2.2 T2V（接 /api/video）' },
    ],
    status: 'live',
    note: '视频生成已接 /api/video',
  },
  'wanxiang-vid-ext': {
    candidates: [
      { upstream: 'siliconflow', model: 'Wan-AI/Wan2.2-I2V-A14B', costUSD: 2, priority: 1, note: '通义万相 Wan 2.2 I2V（图生视频）' },
    ],
    status: 'live',
    note: '视频生成已接 /api/video（图生视频）',
  },
  'happyhorse-ref': { candidates: [], status: 'coming-soon' },
  'happyhorse-t2v': { candidates: [], status: 'coming-soon' },
  'happyhorse-edit': { candidates: [], status: 'coming-soon' },
  'happyhorse-ff': { candidates: [], status: 'coming-soon' },
  'omni-flash': { candidates: [], status: 'coming-soon' },
  'grok-imagine': {
    candidates: [
      { upstream: 'openrouter', model: 'x-ai/grok-imagine-1.5', costUSD: 5, priority: 1 },
    ],
    status: 'overseas',
  },
  'vidu-comic': { candidates: [], status: 'coming-soon' },
  'vidu-mv': { candidates: [], status: 'coming-soon' },
  'fable-5': {
    candidates: [
      { upstream: 'openrouter', model: 'anthropic/claude-fable-5', costUSD: 10, priority: 1, note: '海外模型' },
    ],
    status: 'overseas',
  },
  'pix-v6-fl': { candidates: [], status: 'coming-soon' },

  // ============================ Music 类别 ============================
  'suno-4.5': {
    candidates: [
      { upstream: 'siliconflow', model: 'fnlp/MOSS-TTSD-v0.5', costUSD: 0.5, priority: 1, note: 'MOSS TTS 替代 Suno 文字转语音' },
    ],
    status: 'demo',
    note: '音乐生成尚未接入；先用 TTS 演示',
  },
  'suno-4.5-instrumental': { candidates: [], status: 'coming-soon' },

  // ============================ Voice 类别 ============================
  'doubao-tts-2': {
    candidates: [
      { upstream: 'siliconflow', model: 'FunAudioLLM/CosyVoice2-0.5B', costUSD: 0.1, priority: 1, note: '阿里 CosyVoice 中文 TTS' },
      { upstream: 'siliconflow', model: 'fnlp/MOSS-TTSD-v0.5', costUSD: 0.5, priority: 2 },
    ],
    status: 'live',
    note: '字节火山豆包 TTS 待 endpoint，硅基流动开源 TTS 顶上',
  },
  'gemini-3.1-tts': {
    candidates: [
      { upstream: 'siliconflow', model: 'FunAudioLLM/CosyVoice2-0.5B', costUSD: 0.1, priority: 1 },
    ],
    status: 'live',
  },

  // ============================ Agent 类别 ============================
  'comic-agent': {
    candidates: [
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.5-397B-A17B', costUSD: 1.5, priority: 1, note: 'Agent 推理用 Qwen Max' },
    ],
    status: 'demo',
    note: 'Agent 是上层编排（chain LLM calls），模型用 Qwen Max；UI 待补',
  },
  'ecom-agent': {
    candidates: [
      { upstream: 'siliconflow', model: 'Qwen/Qwen3.5-122B-A10B', costUSD: 0.7, priority: 1 },
    ],
    status: 'demo',
  },
  'long-video-agent': { candidates: [], status: 'coming-soon' },
  'style-switch-agent': { candidates: [], status: 'coming-soon' },
};

/**
 * 选择最优上游（基于用户地区 + 价格 + 可用性）
 * @param {string} modelId - Package 站 model ID
 * @param {Object} opts - { country: 'CN' | 'US' | 'XX' }
 * @returns {Object} candidate
 */
export function selectUpstream(modelId, opts = {}) {
  const cfg = MODEL_ROUTING[modelId];
  if (!cfg) {
    throw new Error(`Model "${modelId}" not in routing table`);
  }
  if (!cfg.candidates || cfg.candidates.length === 0) {
    throw new Error(`Model "${modelId}" has no upstream configured`);
  }

  const isCN = opts.country === 'CN';
  let candidates = [...cfg.candidates];

  // 过滤：去掉没有 key 的上游（部署时跳过；开发时跳过未配置的上游）
  candidates = candidates.filter(c => {
    const upstreamCfg = UPSTREAMS[c.upstream];
    if (!upstreamCfg) return false;
    return upstreamCfg.getKey ? !!upstreamCfg.getKey() : true;
  });
  if (candidates.length === 0) {
    // 全部上游都没配 key，尝试原始列表（让 callUpstream 报错得到具体原因）
    candidates = [...cfg.candidates];
  }

  // 排序: 国内用户 → 国内上游优先 + 价格升序
  //       海外用户 → 全球上游优先 + 价格升序
  candidates.sort((a, b) => {
    const aCN = isCN ? isChinaUpstream(a.upstream) : !isChinaUpstream(a.upstream);
    const bCN = isCN ? isChinaUpstream(b.upstream) : !isChinaUpstream(b.upstream);
    if (aCN && !bCN) return -1;
    if (!aCN && bCN) return 1;
    // 同区域 → 按价格升序
    return (a.costUSD || 0) - (b.costUSD || 0);
  });

  return candidates[0];
}

function isChinaUpstream(name) {
  return ['siliconflow', 'zhipu', 'volcengine', 'moonshot', 'hunyuan', 'baichuan', 'stepfun'].includes(name);
}

/**
 * 带 failover 的调用 — 依次尝试候选上游
 */
export async function callWithFailover(modelId, messages, opts = {}) {
  const cfg = MODEL_ROUTING[modelId];
  if (!cfg) {
    throw new Error(`Model "${modelId}" not in routing table`);
  }
  if (!cfg.candidates || cfg.candidates.length === 0) {
    throw new Error(`Model "${modelId}" has no upstream configured`);
  }

  // 按 selectUpstream 排序后的顺序尝试
  let candidates;
  try {
    candidates = [selectUpstream(modelId, opts), ...cfg.candidates.filter(c => c !== selectUpstream(modelId, opts))];
  } catch (e) {
    candidates = cfg.candidates;
  }

  const errors = [];
  for (const candidate of candidates) {
    try {
      // 字节火山需要 endpoint ID 替换占位符
      let modelIdToUse = candidate.model;
      if (modelIdToUse.startsWith('__') && modelIdToUse.endsWith('__')) {
        errors.push({ candidate, error: 'Endpoint ID not configured yet' });
        continue; // 跳过未配置的 endpoint
      }
      
      const data = await callUpstream(candidate.upstream, modelIdToUse, messages, opts);
      return { data, candidate };
    } catch (e) {
      errors.push({ candidate, error: e.message });
      // 继续下一个
    }
  }

  throw new Error(`All upstreams failed for "${modelId}": ${errors.map(e => e.error).join(' | ')}`);
}

/**
 * 获取所有 model 状态（前端用）
 */
export function getAllModels() {
  return MODEL_ROUTING;
}