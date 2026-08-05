import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import {
  Send, Bot, Sparkles, FileText, Key, Loader2,
  Trash2, BookOpen, ExternalLink
} from 'lucide-react';
import { PDFChatMessage, PDFDocumentMeta } from '../../types/pdf';

interface PDFChatProps {
  pdfMeta: PDFDocumentMeta;
  messages: PDFChatMessage[];
  onSendMessage: (text: string) => void;
  onSummarize: () => void;
  onKeyPoints: () => void;
  onPageClick: (pageNum: number) => void;
  onRemovePDF: () => void;
  isThinking: boolean;
}

export const PDFChat = ({
  pdfMeta,
  messages,
  onSendMessage,
  onSummarize,
  onKeyPoints,
  onPageClick,
  onRemovePDF,
  isThinking,
}: PDFChatProps) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed || isThinking) return;
    onSendMessage(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Helper to parse page reference strings into clickable badges
  const renderMessageContent = (msg: PDFChatMessage) => {
    const text = msg.content;
    const isAi = msg.role === 'assistant';

    if (!isAi) {
      return <p className="text-sm text-slate-100 whitespace-pre-wrap">{text}</p>;
    }

    // Parse Source: Page X or Source: Pages X-Y pattern
    const parts = text.split(/(Source:\s*Pages?\s*\d+(?:–\d+|-?\d+)?)/gi);

    return (
      <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap space-y-2">
        {parts.map((part, i) => {
          const match = part.match(/Source:\s*Pages?\s*(\d+)/i);
          if (match) {
            const pageNum = parseInt(match[1], 10);
            return (
              <button
                key={i}
                onClick={() => onPageClick(pageNum)}
                className="inline-flex items-center gap-1 px-2 py-0.5 my-1 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 hover:bg-sky-500/25 transition-all text-xs font-medium cursor-pointer"
                title={`Jump to page ${pageNum}`}
              >
                <BookOpen className="w-3 h-3 text-sky-400" />
                {part}
                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
              </button>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      {/* Document Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate max-w-[200px]" title={pdfMeta.fileName}>
              {pdfMeta.fileName}
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              {(pdfMeta.fileSize / (1024 * 1024)).toFixed(1)} MB • {pdfMeta.pageCount} pages
            </div>
          </div>
        </div>

        <button
          onClick={onRemovePDF}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Remove PDF"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800 flex-shrink-0">
        <button
          onClick={onSummarize}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 hover:text-white transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          Summarize PDF
        </button>
        <button
          onClick={onKeyPoints}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 hover:text-white transition-colors"
        >
          <Key className="w-3.5 h-3.5 text-amber-400" />
          Key Points
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-sky-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">Ask anything about this document</div>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Try asking for a summary, key arguments, specific statistics, or page citations.
              </p>
            </div>
          </div>
        ) : (
          messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-sky-600 text-white rounded-tr-xs'
                    : 'bg-slate-800/90 border border-slate-700 text-slate-200 rounded-tl-xs'
                }`}
              >
                {renderMessageContent(msg)}
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200 flex-shrink-0 mt-0.5 font-bold text-xs">
                  U
                </div>
              )}
            </motion.div>
          ))
        )}

        {isThinking && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 justify-start"
          >
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-800/90 border border-slate-700 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
              Analyzing document content & formulating response…
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex-shrink-0">
        <div className="relative flex items-center bg-slate-900 border border-slate-800 focus-within:border-sky-500/60 rounded-2xl transition-all">
          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about this PDF…"
            rows={1}
            disabled={isThinking}
            className="w-full pl-4 pr-12 py-3 bg-transparent text-sm text-white placeholder-slate-500 resize-none outline-none max-h-28 scrollbar-none"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isThinking}
            className="absolute right-2 p-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-30 disabled:hover:bg-sky-500 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[10px] text-slate-500 mt-1.5 text-center">
          Press Enter to send • Shift + Enter for new line
        </div>
      </div>
    </div>
  );
};
