// api/debug.js — 检查 Vercel Function 是否收到 env var
// Owner: 虾 | 2026-06-24 | Debug only — delete after verified

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // 只返回 boolean（不暴露 key 内容）— 安全
  const env = {
    ZHIPU_API_KEY: !!process.env.ZHIPU_API_KEY,
    MOONSHOT_API_KEY: !!process.env.MOONSHOT_API_KEY,
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    SILICONFLOW_API_KEY: !!process.env.SILICONFLOW_API_KEY,
    VOLCENGINE_API_KEY: !!process.env.VOLCENGINE_API_KEY,
  };
  
  const lengths = {
    ZHIPU_API_KEY: process.env.ZHIPU_API_KEY?.length || 0,
    MOONSHOT_API_KEY: process.env.MOONSHOT_API_KEY?.length || 0,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY?.length || 0,
    SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY?.length || 0,
    VOLCENGINE_API_KEY: process.env.VOLCENGINE_API_KEY?.length || 0,
  };
  
  return res.status(200).json({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    envSet: env,
    envLengths: lengths,
    timestamp: new Date().toISOString(),
  });
}