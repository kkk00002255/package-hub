// api/debug.js — 检查 Vercel Function 是否收到 env var
// Owner: 虾 | 2026-06-24 | Debug only — delete after verified

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  const env = {
    ZHIPU_API_KEY: !!proces…KEY,
    MOONSHOT_API_KEY: !!proces…KEY,
    OPENROUTER_API_KEY: !!proces…KEY,
    SILICONFLOW_API_KEY: !!proces…KEY,
    VOLCENGINE_API_KEY: !!proces…KEY,
    HUNYUAN_API_KEY: !!proces…KEY,
    BAICHUAN_API_KEY: !!proces…KEY,
    STEPFUN_API_KEY: !!proces…KEY,
  };
  
  const lengths = {
    ZHIPU_API_KEY: proces…ngth || 0,
    MOONSHOT_API_KEY: proces…ngth || 0,
    OPENROUTER_API_KEY: proces…ngth || 0,
    SILICONFLOW_API_KEY: proces…ngth || 0,
    VOLCENGINE_API_KEY: proces…ngth || 0,
    HUNYUAN_API_KEY: proces…ngth || 0,
    BAICHUAN_API_KEY: proces…ngth || 0,
    STEPFUN_API_KEY: proces…ngth || 0,
  };
  
  const activeCount = Object.values(env).filter(v => v).length;
  
  return res.status(200).json({
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    totalUpstreams: 8,
    activeUpstreams: activeCount,
    allConfigured: activeCount === 8,
    envSet: env,
    envLengths: lengths,
    timestamp: new Date().toISOString(),
  });
}
