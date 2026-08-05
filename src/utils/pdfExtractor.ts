import * as pdfjsLib from 'pdfjs-dist';
import { ExtractedPage } from '../types/pdf';

// Configure pdfjs worker URL for Vite / Browser / Electron environments
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    // Attempt local worker load or fallback to CDN to ensure zero broken builds in Electron/Vite
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.0.379'}/pdf.worker.min.mjs`;
  } catch (err) {
    console.warn('[PDFExtractor] Could not set pdfjs worker CDN path:', err);
  }
}

export interface PDFExtractionResult {
  pages: ExtractedPage[];
  pageCount: number;
  totalTextLength: number;
  isScanned: boolean;
}

/**
 * Extracts text page-by-page from an ArrayBuffer or File
 */
export async function extractTextFromPDF(
  fileOrBuffer: File | ArrayBuffer,
  onProgress?: (percent: number, status: string) => void
): Promise<PDFExtractionResult> {
  onProgress?.(10, 'Loading PDF document…');

  let arrayBuffer: ArrayBuffer;
  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
  }

  onProgress?.(30, 'Parsing PDF structure…');
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  const pages: ExtractedPage[] = [];
  let totalTextLength = 0;

  for (let i = 1; i <= pageCount; i++) {
    const progressPercent = Math.min(90, Math.floor(30 + (i / pageCount) * 60));
    onProgress?.(progressPercent, `Extracting page ${i} of ${pageCount}…`);

    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();

    // Extract text items cleanly preserving spaces
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    pages.push({
      pageNumber: i,
      text: pageText,
    });

    totalTextLength += pageText.length;
  }

  // Detect scanned PDF if average text per page is under 30 characters
  const avgCharsPerPage = pageCount > 0 ? totalTextLength / pageCount : 0;
  const isScanned = pageCount > 0 && avgCharsPerPage < 30;

  onProgress?.(100, 'PDF extraction complete!');

  return {
    pages,
    pageCount,
    totalTextLength,
    isScanned,
  };
}

export interface RelevantChunk {
  pageNumber: number;
  text: string;
  score: number;
}

/**
 * Searches PDF page content and extracts top relevant chunks matching user question
 */
export function findRelevantChunks(
  pages: ExtractedPage[],
  query: string,
  maxChunks: number = 6
): RelevantChunk[] {
  if (!pages || pages.length === 0) return [];
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) {
    // If no query, return first few pages
    return pages.slice(0, maxChunks).map(p => ({
      pageNumber: p.pageNumber,
      text: p.text,
      score: 1,
    }));
  }

  // Break query into non-stopword tokens
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'to', 'of', 'for', 'with', 'what', 'how', 'why', 'where', 'when', 'who', 'this', 'that', 'can', 'you', 'please', 'tell', 'me', 'about']);
  const keywords = cleanQuery
    .split(/[\s,?.!/\\;:'"()]+/)
    .map(w => w.toLowerCase())
    .filter(w => w.length > 2 && !stopWords.has(w));

  if (keywords.length === 0) {
    keywords.push(cleanQuery);
  }

  const scoredPages: RelevantChunk[] = pages.map(page => {
    const pageLower = page.text.toLowerCase();
    let score = 0;

    // Exact query phrase match gets highest score boost
    if (pageLower.includes(cleanQuery)) {
      score += 15;
    }

    // Individual keyword match scoring
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}`, 'gi');
      const matches = pageLower.match(regex);
      if (matches) {
        score += matches.length * 3;
      }
    }

    return {
      pageNumber: page.pageNumber,
      text: page.text,
      score,
    };
  });

  // Filter out zero score unless all pages scored 0 (then fallback to first pages)
  let matching = scoredPages.filter(p => p.score > 0);
  if (matching.length === 0) {
    matching = scoredPages.slice(0, Math.min(3, pages.length));
  }

  // Sort descending by relevance score
  matching.sort((a, b) => b.score - a.score);

  return matching.slice(0, maxChunks);
}
