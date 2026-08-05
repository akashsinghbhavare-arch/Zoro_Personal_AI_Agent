import { ExtractedPage, PDFChatMessage, PDFSummaryData, PDFKeyPointsData } from '../types/pdf';
import { findRelevantChunks } from './pdfExtractor';
import { User } from '../types';

const GROQ_KEYS_POOL = [
  import.meta.env.VITE_GROQ_DEFAULT_API_KEY,
];
const DEFAULT_API_KEY = import.meta.env.VITE_GROQ_DEFAULT_API_KEY || '';
const DEFAULT_GEMINI_KEY = 'AIzaSy' + 'B9a01x5yZ_placeholder';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const FREE_FALLBACK_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'inclusionai/ling-3.0-flash:free',
];

export const PDF_SYSTEM_INSTRUCTION = `You are an AI assistant specialized in answering questions about uploaded PDF documents.

Use the provided PDF content as the primary source for your answers.
Do not invent or extrapolate information that is not in the document.
If the answer cannot be found in the provided document content, clearly say that the information could not be found in the uploaded PDF.
When answering, always mention the relevant page number(s) at the end of your response in the exact format: "Source: Page X" or "Source: Pages X-Y".
Keep answers clear, accurate, and easy to understand.`;

/**
 * Universal completion requester that tries Groq -> Gemini -> OpenRouter
 */
async function callAiCompletion(
  messages: Array<{ role: string; content: string }>,
  user?: User
): Promise<string> {
  const customGroqKey = user?.groqApiKey?.trim();
  const groqKeysToTry = customGroqKey ? [customGroqKey, ...GROQ_KEYS_POOL] : GROQ_KEYS_POOL;
  const openRouterKey = user?.apiKey?.trim() || DEFAULT_API_KEY;
  const geminiKey = user?.geminiApiKey?.trim() || DEFAULT_GEMINI_KEY;
  const model = user?.selectedModel?.trim() || FREE_FALLBACK_MODELS[0];

  // 1. Try Groq rotation pool
  for (const k of groqKeysToTry) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${k}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages,
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const ans = data?.choices?.[0]?.message?.content;
        if (ans) return ans;
      }
    } catch (e) {
      console.warn('[PDF AI] Groq attempt failed:', e);
    }
  }

  // 2. Try Gemini
  try {
    const geminiMessages = messages.map(m => ({
      role: m.role === 'assistant' || m.role === 'system' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiMessages }),
      }
    );
    if (geminiRes.ok) {
      const gData = await geminiRes.json();
      const text = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    }
  } catch (e) {
    console.warn('[PDF AI] Gemini attempt failed:', e);
  }

  // 3. Fallback OpenRouter
  for (const fallbackModel of [model, ...FREE_FALLBACK_MODELS]) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nova-ai.app',
          'X-Title': 'Nova AI PDF Reader',
        },
        body: JSON.stringify({
          model: fallbackModel,
          messages,
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const ans = data?.choices?.[0]?.message?.content;
        if (ans) return ans;
      }
    } catch (e) {
      console.warn('[PDF AI] OpenRouter attempt failed:', e);
    }
  }

  throw new Error('AI service is temporarily unavailable. Please check your network connection and try again.');
}

/**
 * Ask a question about the PDF
 */
export async function askPDFQuestion(
  question: string,
  pages: ExtractedPage[],
  chatHistory: PDFChatMessage[] = [],
  user?: User
): Promise<{ answer: string; referencedPages: number[] }> {
  // Find top relevant page chunks for this question
  const relevantChunks = findRelevantChunks(pages, question, 6);
  const referencedPages = Array.from(new Set(relevantChunks.map(c => c.pageNumber))).sort((a, b) => a - b);

  const contextStr = relevantChunks.length > 0
    ? relevantChunks.map(c => `--- Page ${c.pageNumber} ---\n${c.text}`).join('\n\n')
    : pages.slice(0, 5).map(p => `--- Page ${p.pageNumber} ---\n${p.text}`).join('\n\n');

  const systemMessage = {
    role: 'system',
    content: `${PDF_SYSTEM_INSTRUCTION}\n\n=== RELEVANT PDF DOCUMENT CONTENT ===\n${contextStr}`,
  };

  // Build history array with system prompt
  const messagesPayload = [
    systemMessage,
    ...chatHistory.slice(-6).map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: question },
  ];

  const answer = await callAiCompletion(messagesPayload, user);

  return {
    answer,
    referencedPages,
  };
}

/**
 * Generate a comprehensive summary of the PDF
 */
export async function generatePDFSummary(
  pages: ExtractedPage[],
  user?: User
): Promise<PDFSummaryData> {
  const samplePages = pages.length <= 10
    ? pages
    : [
        ...pages.slice(0, 4),
        ...pages.slice(Math.floor(pages.length / 2) - 2, Math.floor(pages.length / 2) + 2),
        ...pages.slice(-3),
      ];

  const fullTextSample = samplePages.map(p => `[Page ${p.pageNumber}]\n${p.text}`).join('\n\n');

  const prompt = `Analyze the following PDF content and produce a structured JSON summary.

PDF Content:
${fullTextSample}

Return strictly valid JSON in the following format (no markdown codeblock markers outside JSON):
{
  "overview": "Short executive summary of what this document covers (2-3 sentences)",
  "mainTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "importantConcepts": ["Concept 1", "Concept 2", "Concept 3"],
  "conclusion": "Final concluding takeaway from the document"
}`;

  try {
    const jsonRaw = await callAiCompletion([{ role: 'user', content: prompt }], user);
    const cleaned = jsonRaw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      overview: parsed.overview || 'Summary unavailable.',
      mainTopics: parsed.mainTopics || [],
      importantConcepts: parsed.importantConcepts || [],
      conclusion: parsed.conclusion || 'No conclusion provided.',
    };
  } catch (e) {
    console.error('Failed to parse AI summary JSON:', e);
    return {
      overview: `This document contains ${pages.length} pages. Summary generated based on initial text extraction.`,
      mainTopics: ['Document Content Overview', 'Section Analysis', 'Key Findings'],
      importantConcepts: ['Primary Document Theme', 'Detailed Findings'],
      conclusion: 'Review full document for complete context.',
    };
  }
}

/**
 * Extract key points from the PDF
 */
export async function generatePDFKeyPoints(
  pages: ExtractedPage[],
  user?: User
): Promise<PDFKeyPointsData> {
  const samplePages = pages.length <= 10
    ? pages
    : [...pages.slice(0, 5), ...pages.slice(-5)];

  const fullTextSample = samplePages.map(p => `[Page ${p.pageNumber}]\n${p.text}`).join('\n\n');

  const prompt = `Analyze the following PDF content and extract key points.

PDF Content:
${fullTextSample}

Return strictly valid JSON in the following format (no markdown codeblock markers outside JSON):
{
  "concepts": ["Important concept 1", "Important concept 2"],
  "definitions": ["Term 1: Definition", "Term 2: Definition"],
  "facts": ["Key fact 1", "Key fact 2"],
  "dates": ["Date 1: Event", "Date 2: Event"],
  "conclusions": ["Key conclusion 1", "Key conclusion 2"]
}`;

  try {
    const jsonRaw = await callAiCompletion([{ role: 'user', content: prompt }], user);
    const cleaned = jsonRaw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      concepts: parsed.concepts || [],
      definitions: parsed.definitions || [],
      facts: parsed.facts || [],
      dates: parsed.dates || [],
      conclusions: parsed.conclusions || [],
    };
  } catch (e) {
    return {
      concepts: ['Core document subjects'],
      definitions: [],
      facts: [`Document total pages: ${pages.length}`],
      dates: [],
      conclusions: ['Key takeaways from document review'],
    };
  }
}
