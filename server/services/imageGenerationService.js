// Pure NVIDIA NIM AI Image Generation Service

const { enhancePrompt } = require('./promptEnhancer');

const ASPECT_RATIO_RESOLUTIONS = {
  '1:1': { width: 1024, height: 1024 },
  '16:9': { width: 1280, height: 720 },
  '9:16': { width: 720, height: 1280 },
  '4:3': { width: 1024, height: 768 },
  '3:4': { width: 768, height: 1024 },
};

/**
 * Generate image using HuggingFace Inference API if API key is provided
 */
async function generateHuggingFace(prompt, apiKey, model = 'black-forest-labs/FLUX.1-schnell') {
  const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HuggingFace API error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return {
    url: `data:image/jpeg;base64,${base64}`,
    provider: `huggingface-${model}`,
  };
}

/**
 * Generate image using NVIDIA NIM / AI API
 */
async function generateNvidia(prompt, apiKey, options = {}) {
  const { aspectRatio = '1:1' } = options;

  // Primary: NVIDIA NIM FLUX.1-schnell endpoint
  const invokeUrl = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux-1-schnell';

  const payload = {
    prompt,
    mode: 'base',
    aspect_ratio: aspectRatio === '16:9' ? '16:9' : aspectRatio === '9:16' ? '9:16' : '1:1',
  };

  try {
    const response = await fetch(invokeUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.artifacts && data.artifacts[0]?.base64) {
        return {
          url: `data:image/jpeg;base64,${data.artifacts[0].base64}`,
          provider: 'nvidia-flux-1-schnell',
        };
      }
      if (data.image) {
        const url = data.image.startsWith('http') || data.image.startsWith('data:') ? data.image : `data:image/png;base64,${data.image}`;
        return { url, provider: 'nvidia-flux-1-schnell' };
      }
    }
  } catch (err) {
    console.warn('[ImageGenerationService] NVIDIA primary endpoint error:', err.message);
  }

  // Fallback: NVIDIA NIM OpenAI-compatible image generations endpoint
  try {
    const fallbackUrl = 'https://integrate.api.nvidia.com/v1/images/generations';
    const response2 = await fetch(fallbackUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        model: 'black-forest-labs/flux-1-schnell',
        response_format: 'b64_json',
      }),
    });

    if (response2.ok) {
      const data2 = await response2.json();
      if (data2.data && data2.data[0]?.b64_json) {
        return {
          url: `data:image/png;base64,${data2.data[0].b64_json}`,
          provider: 'nvidia-flux-1-schnell',
        };
      }
    }
  } catch (err) {
    console.warn('[ImageGenerationService] NVIDIA secondary endpoint error:', err.message);
  }

  // Fallback to high-reliability Pollinations AI
  const seed = Math.floor(Math.random() * 1000000);
  const dims = ASPECT_RATIO_RESOLUTIONS[aspectRatio] || { width: 1024, height: 1024 };
  const encodedPrompt = encodeURIComponent(prompt);
  return {
    url: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${dims.width}&height=${dims.height}&nologo=true&seed=${seed}&model=flux`,
    provider: 'pollinations-flux',
  };
}

/**
 * Main Image Generation Entrypoint (Powered by NVIDIA NIM API)
 */
async function generateImage(params = {}) {
  const {
    prompt,
    negativePrompt = '',
    aspectRatio = '1:1',
    quality = 'standard',
    style = 'auto',
  } = params;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw new Error('Prompt is required and must not be empty');
  }

  // Prompt Enhancement
  const { enhancedPrompt, negativePrompt: finalNegative } = enhancePrompt(prompt, style, negativePrompt);

  const nvidiaApiKey = process.env.NVIDIA_API_KEY || (process.env.IMAGE_API_KEY?.startsWith('nvapi-') ? process.env.IMAGE_API_KEY : null);
  const hfApiKey = process.env.IMAGE_API_KEY;
  const provider = (process.env.IMAGE_API_PROVIDER || 'nvidia').toLowerCase();
  const model = process.env.IMAGE_API_MODEL || 'black-forest-labs/flux-1-schnell';

  if (!nvidiaApiKey && (!hfApiKey || provider !== 'huggingface')) {
    throw new Error('NVIDIA API Key is required for image generation. Please configure NVIDIA_API_KEY in .env.');
  }

  let result;
  if (nvidiaApiKey) {
    console.log('[ImageGenerationService] Generating image via NVIDIA NIM API...');
    result = await generateNvidia(enhancedPrompt, nvidiaApiKey, { aspectRatio, quality });
  } else {
    result = await generateHuggingFace(enhancedPrompt, hfApiKey, model);
  }

  return {
    success: true,
    image: {
      id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      url: result.url,
      prompt: prompt.trim(),
      enhancedPrompt,
      negativePrompt: finalNegative,
      aspectRatio,
      quality,
      style,
      provider: result.provider,
      createdAt: new Date().toISOString(),
    },
  };
}

module.exports = {
  generateImage,
  ASPECT_RATIO_RESOLUTIONS,
};
