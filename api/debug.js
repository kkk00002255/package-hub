// api/debug.js — 检查 Vercel Function 是否收到 env var
// Owner: 虾 | 2026-06-24 | Debug only — delete after verified

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const keys = [
    'ZHIPU_API_KEY',
    'MOONSHOT_API_KEY',
    'OPENROUTER_API_KEY',
    'SILICONFLOW_API_KEY',
    'VOLCENGINE_API_KEY',
    'HUNYUAN_API_KEY',
    'BAICHUAN_API_KEY',
    'STEPFUN_API_KEY',
  ];

  const envSet = {};
  const envLengths = {};
  for (const key of keys) {
    const value = process.env[key];
    envSet[key] = !!value;
    envLengths[key] = value ? value.length : 0;
  }

  const activeCount = Object.values(envSet).filter((v) => v).length;

  return res.status(200).json({
    nodeEnv: process.env.NODE_ENV || 'unknown',
    vercelEnv: process.env.VERCEL_ENV || 'unknown',
    totalUpstreams: keys.length,
    activeUpstreams: activeCount,
    allConfigured: activeCount === keys.length,
    envSet,
    envLengths,
    timestamp: new Date().toISOString(),
  });
}
