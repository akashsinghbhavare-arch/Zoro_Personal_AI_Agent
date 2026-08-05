// Express Image Generation Router

const express = require('express');
const { generateImage } = require('../services/imageGenerationService');

const router = express.Router();

// Simple in-memory rate limiter (10 requests per minute per IP)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;

function checkRateLimit(ip) {
  const now = Date.now();
  const userRecord = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > userRecord.resetTime) {
    userRecord.count = 0;
    userRecord.resetTime = now + RATE_LIMIT_WINDOW_MS;
  }

  userRecord.count += 1;
  rateLimitMap.set(ip, userRecord);

  return userRecord.count <= MAX_REQUESTS_PER_WINDOW;
}

/**
 * POST /api/images/generate
 */
router.post('/generate', async (req, res) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';

  // Rate limit check
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      success: false,
      error: { message: 'Too many image requests. Please wait a minute before generating again.' },
    });
  }

  const {
    prompt,
    negativePrompt = '',
    aspectRatio = '1:1',
    quality = 'standard',
    style = 'auto',
  } = req.body || {};

  // Validation 1: Prompt presence & length
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({
      success: false,
      error: { message: 'Prompt is required and must not be empty.' },
    });
  }

  if (prompt.length > 1000) {
    return res.status(400).json({
      success: false,
      error: { message: 'Prompt exceeds maximum length of 1000 characters.' },
    });
  }

  // Validation 2: Aspect Ratio
  const validAspectRatios = ['1:1', '16:9', '9:16', '4:3', '3:4'];
  if (!validAspectRatios.includes(aspectRatio)) {
    return res.status(400).json({
      success: false,
      error: { message: `Invalid aspect ratio. Supported: ${validAspectRatios.join(', ')}` },
    });
  }

  // Validation 3: Quality
  const validQualities = ['standard', 'hd'];
  if (!validQualities.includes(quality)) {
    return res.status(400).json({
      success: false,
      error: { message: `Invalid quality setting. Supported: ${validQualities.join(', ')}` },
    });
  }

  try {
    const result = await generateImage({
      prompt,
      negativePrompt,
      aspectRatio,
      quality,
      style,
    });

    return res.json(result);
  } catch (err) {
    console.error('[ImageRoutes] Generation error:', err);
    return res.status(500).json({
      success: false,
      error: { message: 'Image generation is temporarily unavailable. Please try again in a moment.' },
    });
  }
});

module.exports = router;
