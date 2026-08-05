// Server-Side Structured Prompt Processing Engine

const STYLE_PRESETS = {
  auto: '',
  photorealistic: 'RAW professional photograph, 8k resolution, shot on 35mm lens, f/1.8 aperture, DSLR, natural lighting, sharp focus, hyperrealistic skin and surface textures',
  cinematic: 'cinematic movie still, 8k anamorphic lens flare, dramatic lighting, depth of field, color graded, IMAX quality',
  anime: 'masterpiece anime illustration, studio quality art, vibrant colors, clean crisp lines, high quality anime aesthetic',
  '3d': '3D Octane render, Pixar style 3D, smooth ray tracing, physically based rendering, 4k ultra detailed',
  illustration: 'hand-crafted digital illustration, rich textures, expressive brush strokes, trending on artstation',
  'digital-art': 'detailed digital painting, vivid color palette, highly stylized, master composition',
  minimalist: 'minimalist design, clean shapes, negative space, elegant vector art, restrained color palette',
};

const NEGATIVE_PROMPT_DEFAULTS = [
  'distorted anatomy',
  'malformed hands',
  'extra limbs',
  'duplicated objects',
  'blurry image',
  'low detail',
  'incorrect proportions',
  'unwanted text',
  'watermark',
  'cropped subject',
  'deformed face',
].join(', ');

/**
 * Structuring User Prompts into Subject, Action, Environment, Composition, Lighting, and Style.
 */
function analyzeAndStructurePrompt(userPrompt, style = 'auto') {
  const cleanPrompt = userPrompt.trim();

  // Basic structural segmentation
  const structure = {
    subject: cleanPrompt,
    action: '',
    environment: '',
    composition: 'medium shot, centered composition',
    lighting: 'natural balanced lighting',
    style: STYLE_PRESETS[style] || STYLE_PRESETS.auto,
    mood: 'atmospheric',
    constraints: 'high resolution, 8k, detailed details',
  };

  return structure;
}

/**
 * Main prompt enhancement function.
 * Preserves user intent while adding photographic clarity.
 */
function enhancePrompt(userPrompt, style = 'auto', customNegative = '') {
  const clean = (userPrompt || '').trim();
  if (!clean) return { enhancedPrompt: '', negativePrompt: NEGATIVE_PROMPT_DEFAULTS };

  const structured = analyzeAndStructurePrompt(clean, style);

  // Build enhanced prompt
  let enhancedPrompt = structured.subject;
  if (structured.style) {
    enhancedPrompt += `, ${structured.style}`;
  } else {
    enhancedPrompt += `, high detail, professional composition, natural lighting`;
  }

  // Build combined negative prompt
  let finalNegative = NEGATIVE_PROMPT_DEFAULTS;
  if (customNegative && customNegative.trim()) {
    finalNegative = `${customNegative.trim()}, ${NEGATIVE_PROMPT_DEFAULTS}`;
  }

  return {
    enhancedPrompt,
    negativePrompt: finalNegative,
    structured,
  };
}

module.exports = {
  enhancePrompt,
  analyzeAndStructurePrompt,
  STYLE_PRESETS,
  NEGATIVE_PROMPT_DEFAULTS,
};
