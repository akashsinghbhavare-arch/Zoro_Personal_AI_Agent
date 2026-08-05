import { useState, useEffect } from 'react';
import { PDFUploader } from './PDFUploader';
import { PDFViewer } from './PDFViewer';
import { PDFChat } from './PDFChat';
import { PDFSummaryModal } from './PDFSummaryModal';
import {
  PDFDocumentMeta, PDFChatMessage, PDFSession
} from '../../types/pdf';
import { extractTextFromPDF } from '../../utils/pdfExtractor';
import { askPDFQuestion, generatePDFSummary, generatePDFKeyPoints } from '../../utils/pdfAiService';
import { getPDFSessions, savePDFSession, deletePDFSession } from '../../utils/pdfStorage';
import { User } from '../../types';
import { FileText, Plus, BookOpen, MessageSquare, ArrowLeft } from 'lucide-react';

interface PDFReaderProps {
  user?: User;
  onBackToChat?: () => void;
}

export const PDFReader = ({ user, onBackToChat }: PDFReaderProps) => {
  const [sessions, setSessions] = useState<PDFSession[]>([]);
  const [currentSession, setCurrentSession] = useState<PDFSession | null>(null);

  // Uploading / processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [scannedWarning, setScannedWarning] = useState<boolean>(false);

  // Active view states
  const [rawPdfFile, setRawPdfFile] = useState<File | ArrayBuffer | string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'viewer' | 'chat'>('viewer');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'summary' | 'key-points'>('summary');

  // Load saved sessions on mount
  useEffect(() => {
    const saved = getPDFSessions();
    setSessions(saved);
    if (saved.length > 0 && !currentSession) {
      // Restore latest session if available
      const latest = saved[0];
      setCurrentSession(latest);
      if (latest.pdfDataUrl) {
        setRawPdfFile(latest.pdfDataUrl);
      }
    }
  }, []);

  // Save session state changes
  useEffect(() => {
    if (currentSession) {
      savePDFSession(currentSession);
    }
  }, [currentSession]);

  // Handle PDF File Upload
  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setProcessingProgress(5);
    setProcessingStatus('Starting PDF extraction…');
    setError(null);
    setScannedWarning(false);

    try {
      // Store local object URL or buffer for PDF Viewer
      const arrayBuffer = await file.arrayBuffer();
      setRawPdfFile(arrayBuffer);

      // Extract text page by page
      const result = await extractTextFromPDF(arrayBuffer, (percent, status) => {
        setProcessingProgress(percent);
        setProcessingStatus(status);
      });

      if (result.isScanned) {
        setScannedWarning(true);
      }

      if (result.pages.length === 0 || result.totalTextLength === 0) {
        setError("We couldn't extract readable text from this PDF. It may be empty or password-protected.");
        setIsProcessing(false);
        return;
      }

      // Create new session object
      const meta: PDFDocumentMeta = {
        id: `pdf-${Date.now()}`,
        fileName: file.name,
        fileSize: file.size,
        pageCount: result.pageCount,
        status: 'ready',
        isScanned: result.isScanned,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newSession: PDFSession = {
        id: meta.id,
        pdfMeta: meta,
        pages: result.pages,
        messages: [],
      };

      setCurrentSession(newSession);
      setSessions(prev => [newSession, ...prev]);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('[PDFReader] Extraction error:', err);
      setError(err?.message || 'Failed to read PDF file. Please verify it is a valid document.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Q&A send
  const handleSendMessage = async (text: string) => {
    if (!currentSession) return;

    const userMsg: PDFChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...currentSession.messages, userMsg];
    setCurrentSession(prev => prev ? { ...prev, messages: updatedMessages } : null);
    setIsThinking(true);

    try {
      const response = await askPDFQuestion(
        text,
        currentSession.pages,
        currentSession.messages,
        user
      );

      const aiMsg: PDFChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
        pageReferences: response.referencedPages,
      };

      setCurrentSession(prev =>
        prev
          ? {
              ...prev,
              messages: [...updatedMessages, aiMsg],
              pdfMeta: { ...prev.pdfMeta, updatedAt: new Date() },
            }
          : null
      );

      // Auto-jump viewer to referenced page if provided
      if (response.referencedPages.length > 0) {
        setCurrentPage(response.referencedPages[0]);
      }
    } catch (err: any) {
      const errorMsg: PDFChatMessage = {
        id: `msg-${Date.now()}-ai`,
        role: 'assistant',
        content: `Sorry, an error occurred while analyzing the document: ${err?.message || 'AI service unavailable'}`,
        timestamp: new Date(),
      };
      setCurrentSession(prev =>
        prev ? { ...prev, messages: [...updatedMessages, errorMsg] } : null
      );
    } finally {
      setIsThinking(false);
    }
  };

  // Handle Summarize PDF action
  const handleSummarize = async () => {
    if (!currentSession) return;

    if (currentSession.summary) {
      setModalType('summary');
      setIsModalOpen(true);
      return;
    }

    setIsThinking(true);
    try {
      const summary = await generatePDFSummary(currentSession.pages, user);
      setCurrentSession(prev => prev ? { ...prev, summary } : null);
      setModalType('summary');
      setIsModalOpen(true);
    } catch (err) {
      console.error('[PDFReader] Summary generation error:', err);
    } finally {
      setIsThinking(false);
    }
  };

  // Handle Key Points action
  const handleKeyPoints = async () => {
    if (!currentSession) return;

    if (currentSession.keyPoints) {
      setModalType('key-points');
      setIsModalOpen(true);
      return;
    }

    setIsThinking(true);
    try {
      const keyPoints = await generatePDFKeyPoints(currentSession.pages, user);
      setCurrentSession(prev => prev ? { ...prev, keyPoints } : null);
      setModalType('key-points');
      setIsModalOpen(true);
    } catch (err) {
      console.error('[PDFReader] Key points error:', err);
    } finally {
      setIsThinking(false);
    }
  };

  // Handle Remove PDF session
  const handleRemovePDF = () => {
    if (!currentSession) return;
    const remaining = deletePDFSession(currentSession.id);
    setSessions(remaining);
    if (remaining.length > 0) {
      setCurrentSession(remaining[0]);
    } else {
      setCurrentSession(null);
      setRawPdfFile(null);
    }
  };

  // Switch session
  const handleSelectSession = (s: PDFSession) => {
    setCurrentSession(s);
    if (s.pdfDataUrl) {
      setRawPdfFile(s.pdfDataUrl);
    }
    setCurrentPage(1);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
      {/* Top Bar / Mobile Tabs */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          {onBackToChat && (
            <button
              onClick={onBackToChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Back to Chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-sky-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white leading-tight">AI PDF Reader</h2>
              <p className="text-[11px] text-slate-400">Interactive Document Q&A</p>
            </div>
          </div>
        </div>

        {/* Saved Sessions Picker */}
        {sessions.length > 0 && currentSession && (
          <div className="flex items-center gap-2">
            <select
              value={currentSession.id}
              onChange={e => {
                const found = sessions.find(s => s.id === e.target.value);
                if (found) handleSelectSession(found);
              }}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-sky-400 max-w-[180px] truncate"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  📄 {s.pdfMeta.fileName}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setCurrentSession(null);
                setRawPdfFile(null);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-xs font-semibold text-sky-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New PDF
            </button>
          </div>
        )}

        {/* Mobile Tab Toggle */}
        {currentSession && (
          <div className="flex lg:hidden bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              onClick={() => setActiveTabMobile('viewer')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTabMobile === 'viewer' ? 'bg-sky-500 text-white' : 'text-slate-400'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 inline mr-1" /> PDF
            </button>
            <button
              onClick={() => setActiveTabMobile('chat')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTabMobile === 'chat' ? 'bg-sky-500 text-white' : 'text-slate-400'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 inline mr-1" /> AI Chat
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {!currentSession ? (
          /* Empty State / Upload Zone */
          <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
            <PDFUploader
              onFileSelect={handleFileSelect}
              isProcessing={isProcessing}
              processingProgress={processingProgress}
              processingStatus={processingStatus}
              error={error}
              scannedWarning={scannedWarning}
            />
          </div>
        ) : (
          /* Active Split View */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            {/* Left: PDF Viewer */}
            <div className={`flex-1 h-full ${activeTabMobile === 'viewer' ? 'block' : 'hidden lg:block'}`}>
              <PDFViewer
                pdfFileOrBuffer={rawPdfFile}
                pages={currentSession.pages}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>

            {/* Right: AI Chat Assistant */}
            <div className={`w-full lg:w-[420px] xl:w-[460px] h-full ${activeTabMobile === 'chat' ? 'block' : 'hidden lg:block'}`}>
              <PDFChat
                pdfMeta={currentSession.pdfMeta}
                messages={currentSession.messages}
                onSendMessage={handleSendMessage}
                onSummarize={handleSummarize}
                onKeyPoints={handleKeyPoints}
                onPageClick={setCurrentPage}
                onRemovePDF={handleRemovePDF}
                isThinking={isThinking}
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary / Key Points Modal */}
      {currentSession && (
        <PDFSummaryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          type={modalType}
          summaryData={currentSession.summary}
          keyPointsData={currentSession.keyPoints}
          fileName={currentSession.pdfMeta.fileName}
        />
      )}
    </div>
  );
};
