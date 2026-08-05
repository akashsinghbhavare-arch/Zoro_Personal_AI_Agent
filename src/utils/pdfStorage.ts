import { PDFSession } from '../types/pdf';

const STORAGE_KEY = 'nova_ai_pdf_sessions';

export function getPDFSessions(): PDFSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((session: any) => ({
      ...session,
      pdfMeta: {
        ...session.pdfMeta,
        createdAt: new Date(session.pdfMeta.createdAt),
        updatedAt: new Date(session.pdfMeta.updatedAt),
      },
      messages: (session.messages || []).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch (err) {
    console.error('[PDFStorage] Failed to read sessions from localStorage:', err);
    return [];
  }
}

export function savePDFSessions(sessions: PDFSession[]): void {
  try {
    // Save metadata and messages to localStorage (strip pdfDataUrl if huge to save quota)
    const sanitized = sessions.map(session => ({
      ...session,
      pdfDataUrl: session.pdfDataUrl && session.pdfDataUrl.length < 5000000 ? session.pdfDataUrl : undefined,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (err) {
    console.warn('[PDFStorage] Could not write to localStorage:', err);
  }
}

export function savePDFSession(session: PDFSession): void {
  const sessions = getPDFSessions();
  const existingIndex = sessions.findIndex(s => s.id === session.id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.unshift(session);
  }
  savePDFSessions(sessions);
}

export function deletePDFSession(sessionId: string): PDFSession[] {
  const sessions = getPDFSessions();
  const filtered = sessions.filter(s => s.id !== sessionId);
  savePDFSessions(filtered);
  return filtered;
}
