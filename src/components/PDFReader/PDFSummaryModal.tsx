import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Key, CheckCircle, BookOpen, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { PDFSummaryData, PDFKeyPointsData } from '../../types/pdf';

interface PDFSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'summary' | 'key-points';
  summaryData?: PDFSummaryData | null;
  keyPointsData?: PDFKeyPointsData | null;
  fileName: string;
}

export const PDFSummaryModal = ({
  isOpen,
  onClose,
  type,
  summaryData,
  keyPointsData,
  fileName,
}: PDFSummaryModalProps) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    let content = '';
    if (type === 'summary' && summaryData) {
      content = `SUMMARY FOR: ${fileName}\n\nOVERVIEW:\n${summaryData.overview}\n\nMAIN TOPICS:\n${summaryData.mainTopics.map(t => `• ${t}`).join('\n')}\n\nIMPORTANT CONCEPTS:\n${summaryData.importantConcepts.map(c => `• ${c}`).join('\n')}\n\nCONCLUSION:\n${summaryData.conclusion}`;
    } else if (type === 'key-points' && keyPointsData) {
      content = `KEY POINTS FOR: ${fileName}\n\nKEY CONCEPTS:\n${keyPointsData.concepts.map(c => `• ${c}`).join('\n')}\n\nDEFINITIONS:\n${keyPointsData.definitions.map(d => `• ${d}`).join('\n')}\n\nKEY FACTS:\n${keyPointsData.facts.map(f => `• ${f}`).join('\n')}\n\nCONCLUSIONS:\n${keyPointsData.conclusions.map(c => `• ${c}`).join('\n')}`;
    }

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                type === 'summary' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {type === 'summary' ? <Sparkles className="w-5 h-5" /> : <Key className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">
                  {type === 'summary' ? 'PDF Executive Summary' : 'PDF Key Points & Insights'}
                </h3>
                <p className="text-xs text-slate-400 font-mono truncate max-w-sm">
                  {fileName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {type === 'summary' && summaryData && (
              <>
                {/* Overview */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" /> Overview
                  </div>
                  <p className="text-sm text-slate-200 bg-slate-800/60 border border-slate-700/60 p-4 rounded-2xl leading-relaxed">
                    {summaryData.overview}
                  </p>
                </div>

                {/* Main Topics */}
                {summaryData.mainTopics.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                      Main Topics Covered
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {summaryData.mainTopics.map((topic, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 bg-slate-800/40 border border-slate-800 rounded-xl text-xs text-slate-200">
                          <CheckCircle className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                          <span>{topic}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Concepts */}
                {summaryData.importantConcepts.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Important Concepts
                    </div>
                    <ul className="space-y-2">
                      {summaryData.importantConcepts.map((concept, i) => (
                        <li key={i} className="text-xs text-slate-300 bg-slate-800/40 border border-slate-800 p-3 rounded-xl flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                          <span>{concept}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Conclusion */}
                {summaryData.conclusion && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Conclusion & Takeaway
                    </div>
                    <p className="text-xs text-slate-300 bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-2xl leading-relaxed">
                      {summaryData.conclusion}
                    </p>
                  </div>
                )}
              </>
            )}

            {type === 'key-points' && keyPointsData && (
              <>
                {/* Concepts */}
                {keyPointsData.concepts.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                      Core Concepts
                    </div>
                    <div className="space-y-2">
                      {keyPointsData.concepts.map((c, i) => (
                        <div key={i} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-200 flex items-start gap-2">
                          <Key className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Definitions */}
                {keyPointsData.definitions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
                      Key Definitions
                    </div>
                    <div className="space-y-2">
                      {keyPointsData.definitions.map((d, i) => (
                        <div key={i} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-200">
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Facts */}
                {keyPointsData.facts.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Important Facts & Findings
                    </div>
                    <div className="space-y-2">
                      {keyPointsData.facts.map((f, i) => (
                        <div key={i} className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs text-slate-200 flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conclusions */}
                {keyPointsData.conclusions.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                      Key Conclusions
                    </div>
                    <div className="space-y-2">
                      {keyPointsData.conclusions.map((c, i) => (
                        <div key={i} className="p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl text-xs text-slate-200">
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
