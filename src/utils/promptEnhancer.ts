// Layer 1: AI Prompt Enhancer Service

const GROQ_KEYS_POOL = [import.meta.env.VITE_GROQ_DEFAULT_API_KEY].filter(Boolean);

const getRandomGroqKey = (): string => {
  const idx = Math.floor(Math.random() * GROQ_KEYS_POOL.length);
  return GROQ_KEYS_POOL[idx];
};

/**
 * Fallback prompt enhancer using rule-based aesthetic expansion if AI service is offline
 */
export const enhancePromptAlgorithmic = (prompt: string, style: string = 'natural'): string => {
  const clean = prompt.trim();
  if (!clean) return clean;

  const styleEnhancements: Record<string, string> = {
    photorealistic: 'detailed photograph, 8k resolution, shot on 35mm lens, f/1.8 aperture, natural sunlight, depth of field, sharp focus, professional color grading',
    anime: 'masterpiece anime illustration, studio quality art, vibrant colors, expressive character lighting, crisp line art',
    cyberpunk: 'epic cyberpunk scene, neon glowing accents, rain-slicked surfaces, volumetric lighting, futuristic city atmosphere, octane render',
    '3d-render': '3D Octane render, Pixar-style lighting, smooth ray tracing, physically based materials, high resolution detail',
    watercolor: 'fine watercolor painting, soft wet-on-wet blend, expressive brush strokes, elegant paper texture, artistic color splash',
    fantasy: 'epic fantasy illustration, dramatic cinematic lighting, intricate magical details, atmospheric background, 8k resolution',
    natural: 'high detail, natural lighting, crisp focus, rich texture, professional composition',
  };

  const enhancement = styleEnhancements[style] || styleEnhancements.natural;
  return `${clean}, ${enhancement}`;
};

/**
 * Enhance prompt using AI LLM model (Groq Llama-3.3-70b)
 */
export const enhancePromptWithAI = async (
  userPrompt: string,
  style: string = 'natural'
): Promise<string> => {
  const cleanPrompt = userPrompt.trim();
  if (!cleanPrompt) return userPrompt;

  const systemInstruction = `You are an expert AI image prompt engineer.
Your task is to take a simple user concept and rewrite it into a highly detailed, descriptive, and vivid image generation prompt.

Rules:
1. Preserve all core subjects and actions from the user's original request.
2. Add specific details regarding lighting, composition, background elements, camera angle, color palette, and textures.
3. Keep the prompt concise (between 25 and 50 words).
4. Do NOT output explanations, introductory text, or quotation marks. Output ONLY the enhanced prompt string.
5. Target style: ${style}.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getRandomGroqKey()}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Enhance this image prompt for a ${style} style: "${cleanPrompt}"` },
        ],
        temperature: 0.6,
        max_tokens: 150,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const enhanced = data?.choices?.[0]?.message?.content?.trim();
      if (enhanced && enhanced.length > 10) {
        // Strip out any accidental wrapping quotes
        return enhanced.replace(/^["']|["']$/g, '');
      }
    }
  } catch (err) {
    console.warn('[PromptEnhancer] Groq API call failed, falling back to algorithmic enhancement:', err);
  }

  // Fallback to local rule-based enhancement
  return enhancePromptAlgorithmic(cleanPrompt, style);
};
