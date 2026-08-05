export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface PDFDocumentMeta {
  id: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  status: 'uploading' | 'extracting' | 'ready' | 'error';
  errorMessage?: string;
  isScanned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PDFChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  pageReferences?: number[];
}

export interface PDFSummaryData {
  overview: string;
  mainTopics: string[];
  importantConcepts: string[];
  conclusion: string;
}

export interface PDFKeyPointsData {
  concepts: string[];
  definitions: string[];
  facts: string[];
  dates?: string[];
  conclusions: string[];
}

export interface PDFSession {
  id: string;
  userId?: string;
  pdfMeta: PDFDocumentMeta;
  pages: ExtractedPage[];
  messages: PDFChatMessage[];
  summary?: PDFSummaryData;
  keyPoints?: PDFKeyPointsData;
  pdfDataUrl?: string; // Data URL or Object URL for locally loaded PDF
}
