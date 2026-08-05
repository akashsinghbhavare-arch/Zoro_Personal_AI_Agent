// Code Assistant Chat API Route

const express = require('express');
const router = express.Router();

const GROQ_KEYS = [
  process.env.GROQ_KEY_1,
  process.env.GROQ_KEY_2,
  process.env.GROQ_KEY_3,
  process.env.GROQ_KEY_4,
].filter(Boolean);

const getKey = () => GROQ_KEYS[Math.floor(Math.random() * GROQ_KEYS.length)];

const MODE_SYSTEM_PROMPTS = {
  ask: 'You are an expert programming assistant. Answer clearly and concisely. Use code blocks with language labels for all code examples. Be practical and focus on solutions.',
  generate: 'You are an expert code generator. Generate complete, working, production-quality code. Always include: imports, error handling, and comments. Use proper code blocks with language labels.',
  debug: 'You are an expert debugger. Analyze the error or code provided. Explain: 1) What the error means, 2) Root cause, 3) How to fix it. Provide corrected code in code blocks.',
  fix: 'You are an expert code fixer. Identify bugs and provide the corrected code. Show a clear before/after. Explain WHY the fix works.',
  explain: 'You are an expert code explainer. Explain the provided code clearly, line-by-line when needed. Make explanations accessible to the skill level implied by the question.',
  refactor: 'You are an expert code refactoring specialist. Improve code quality, readability, and maintainability without changing behavior. Show the refactored version with explanations of what changed and why.',
  review: 'You are an expert code reviewer. Review for: Bugs, Security issues, Performance problems, Code quality, Best practices. Structure your response with clear sections.',
  optimize: 'You are a performance optimization expert. Identify bottlenecks, suggest improvements with concrete code examples. Explain time/space complexity trade-offs.',
  convert: 'You are an expert in multiple programming languages. Convert the provided code accurately, preserving logic and functionality. Note any language-specific idioms or differences.',
};

/**
 * POST /api/code-assistant/chat
 */
router.post('/chat', async (req, res) => {
  const { message, mode = 'ask', files = [], history = [] } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: { message: 'Message is required.' } });
  }
  if (message.length > 8000) {
    return res.status(400).json({ success: false, error: { message: 'Message too long (max 8000 characters).' } });
  }

  const systemPrompt = MODE_SYSTEM_PROMPTS[mode] || MODE_SYSTEM_PROMPTS.ask;

  // Build context from attached files
  let fileContext = '';
  if (files && files.length > 0) {
    fileContext = '\n\n--- Project Context Files ---\n';
    files.forEach(f => {
      fileContext += `\n### File: ${f.path}\n\`\`\`\n${f.content?.substring(0, 3000) || ''}\n\`\`\`\n`;
    });
  }

  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt + (fileContext ? fileContext : '') },
    ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message.trim() },
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getKey()}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[CodeAssistant] Groq error:', err);
      return res.status(500).json({ success: false, error: { message: 'AI service temporarily unavailable.' } });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || '';

    return res.json({
      success: true,
      reply,
      mode,
      model: 'llama-3.3-70b-versatile',
    });
  } catch (err) {
    console.error('[CodeAssistant] Fatal error:', err);
    return res.status(500).json({ success: false, error: { message: 'Code Assistant is temporarily unavailable. Please try again.' } });
  }
});

module.exports = router;
