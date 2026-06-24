// api/_lib/multimodal.js
// 多模态路由 — image / video / audio 三个端点的统一上游 adapter
// Owner: 虾 | 2026-06-24

const ENDPOINTS = {
  siliconflow: {
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    endpoints: {
      image: '/images/generations',
      video: '/video/generations',  // 硅基流动 Wan 2.2
      audio: '/audio/speech',       // 硅基流动 CosyVoice / TTS
    },
    getKey: () => process.env.SILICONFLOW_API_KEY,
    timeoutMs: 180000, // 视频生成可能 60-120s
  },
  volcengine: {
    name: 'Volcengine',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    endpoints: {
      image: '/images/generations',
      video: '/contents/generations/tasks', // 字节火山 Seedance async
      audio: '/audio/speech',
    },
    getKey: () => process.env.VOLCENGINE_API_KEY,
    timeoutMs: 300000, // 字节火山视频生成更慢
    requiresEndpointId: true,
  },
};

// ============ Image ============
export async function generateImage(model, prompt, opts = {}) {
  // 硅基流动最便宜最稳定
  const sfKey = ENDPOINTS.siliconflow.getKey();
  if (!sfKey) throw new Error('SiliconFlow key not configured');

  const size = opts.size || '1024x1024';
  const n = opts.n || 1;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ENDPOINTS.siliconflow.timeoutMs);

  try {
    const r = await fetch(`${ENDPOINTS.siliconflow.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sfKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        image_size: size,
        num_images: n,
        num_inference_steps: opts.steps || 20,
        guidance_scale: opts.guidance || 7.5,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`SiliconFlow image API error (${r.status}): ${errText.slice(0, 200)}`);
    }

    const data = await r.json();
    return {
      images: data.images || [],
      upstream: 'siliconflow',
      model,
    };
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new Error(`Image generation timeout after ${ENDPOINTS.siliconflow.timeoutMs / 1000}s`);
    }
    throw e;
  }
}

// ============ Video ============
// 硅基流动 Wan 2.2 视频生成（异步：先提交 → 轮询 → 拿 URL）
export async function generateVideo(model, prompt, opts = {}) {
  const sfKey = ENDPOINTS.siliconflow.getKey();
  if (!sfKey) throw new Error('SiliconFlow key not configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ENDPOINTS.siliconflow.timeoutMs);

  try {
    // Step 1: 提交任务
    const submitR = await fetch(`${ENDPOINTS.siliconflow.baseUrl}/video/submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sfKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        image_size: opts.size || '1280x720',
        num_frames: opts.frames || 16,
        fps: opts.fps || 16,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!submitR.ok) {
      const errText = await submitR.text();
      throw new Error(`SiliconFlow video submit error (${submitR.status}): ${errText.slice(0, 200)}`);
    }

    const submitData = await submitR.json();
    const requestId = submitData.requestId || submitData.task_id || submitData.id;
    if (!requestId) {
      throw new Error('No requestId from video submit response');
    }

    // Step 2: 轮询结果
    return await pollVideoStatus(requestId, sfKey, opts.pollIntervalMs || 5000, opts.maxPollAttempts || 24);
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new Error(`Video generation timeout after ${ENDPOINTS.siliconflow.timeoutMs / 1000}s`);
    }
    throw e;
  }
}

async function pollVideoStatus(requestId, apiKey, intervalMs, maxAttempts) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));

    const r = await fetch(`${ENDPOINTS.siliconflow.baseUrl}/video/status?requestId=${encodeURIComponent(requestId)}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!r.ok) {
      continue; // 轮询失败重试
    }

    const data = await r.json();
    const status = (data.status || '').toLowerCase();

    if (status === 'succeed' || status === 'success' || status === 'completed' || status === 'done') {
      return {
        videos: data.results?.videos || data.videos || [{ url: data.video_url || data.url }],
        upstream: 'siliconflow',
        model: data.model,
        requestId,
      };
    }
    if (status === 'failed' || status === 'fail' || status === 'error') {
      throw new Error(`Video generation failed: ${data.error || JSON.stringify(data)}`);
    }
    // 其他状态（pending, processing, running）继续轮询
  }
  throw new Error(`Video polling timeout after ${maxAttempts} attempts`);
}

// ============ Audio (TTS) ============
export async function generateAudio(model, text, opts = {}) {
  const sfKey = ENDPOINTS.siliconflow.getKey();
  if (!sfKey) throw new Error('SiliconFlow key not configured');

  const voice = opts.voice || 'alloy';
  const format = opts.format || 'mp3';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);

  try {
    const r = await fetch(`${ENDPOINTS.siliconflow.baseUrl}/audio/speech`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sfKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        response_format: format,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`SiliconFlow audio API error (${r.status}): ${errText.slice(0, 200)}`);
    }

    // 音频返回二进制
    const buffer = await r.arrayBuffer();
    // Vercel Function 不能直接返回二进制（限制），所以 base64 编码
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:audio/${format};base64,${base64}`;

    return {
      audio: dataUrl,
      format,
      upstream: 'siliconflow',
      model,
    };
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new Error('Audio generation timeout after 60s');
    }
    throw e;
  }
}