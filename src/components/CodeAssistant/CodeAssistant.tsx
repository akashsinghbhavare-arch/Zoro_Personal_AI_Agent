import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Code2, PanelLeftOpen, PanelLeftClose, X
} from 'lucide-react';
import { ProjectExplorer } from './ProjectExplorer';
import { CodeChat } from './CodeChat';
import { CodeEditor } from './CodeEditor';
import { User } from '../../types';

interface CodeAssistantProps {
  user?: User;
  onBackToChat?: () => void;
}

export const CodeAssistant = ({ user, onBackToChat }: CodeAssistantProps) => {
  const [showExplorer, setShowExplorer] = useState(true);
  const [activeFile, setActiveFile] = useState<{ path: string; content: string } | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<{ path: string; content: string }[]>([]);

  const handleFileSelect = (path: string, content: string) => {
    setActiveFile({ path, content });
  };

  const attachFileToChat = () => {
    if (!activeFile) return;
    setAttachedFiles(prev => {
      if (prev.find(f => f.path === activeFile.path)) return prev;
      return [...prev, activeFile];
    });
  };

  const detachFile = (path: string) => {
    setAttachedFiles(prev => prev.filter(f => f.path !== path));
  };

  // Detect language from file extension
  const getLang = (path: string): string => {
    const ext = path.split('.').pop() || '';
    const map: Record<string, string> = {
      ts: 'ts', tsx: 'ts', js: 'js', jsx: 'js',
      py: 'python', json: 'json', css: 'css', html: 'html',
      md: 'markdown', sh: 'bash', sql: 'sql',
    };
    return map[ext] || 'text';
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#070D18' }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 bg-slate-950/60 backdrop-blur-sm shrink-0">
        <button
          onClick={onBackToChat}
          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Code Assistant</h1>
            <p className="text-[11px] text-slate-500">
              {user ? `${user.nickname || user.username}'s AI Coding Workspace` : 'AI-powered coding workspace'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowExplorer(e => !e)}
          className="ml-2 p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          title={showExplorer ? 'Hide Explorer' : 'Show Explorer'}
        >
          {showExplorer ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        {attachedFiles.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-500">Context:</span>
            {attachedFiles.map(f => (
              <span key={f.path} className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] rounded-full">
                {f.path.split('/').pop()}
                <button onClick={() => detachFile(f.path)} className="hover:text-white ml-0.5">
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panel 1: File Explorer */}
        <AnimatePresence initial={false}>
          {showExplorer && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 220, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 250 }}
              className="shrink-0 border-r border-slate-800 overflow-hidden"
            >
              <div className="w-[220px] h-full">
                <ProjectExplorer onFileSelect={handleFileSelect} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Panel 2: Code Viewer */}
        <div className="flex flex-col w-0 flex-1 min-w-0 border-r border-slate-800">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 shrink-0">
            <span className="text-xs text-slate-400 font-mono truncate max-w-xs">
              {activeFile ? activeFile.path.split('/').slice(-2).join('/') : 'No file selected'}
            </span>
            {activeFile && (
              <button
                onClick={attachFileToChat}
                className="text-[11px] px-2.5 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-300 rounded-lg transition-colors"
              >
                + Add to context
              </button>
            )}
          </div>

          {activeFile ? (
            <div className="flex-1 overflow-auto p-4 bg-slate-950/40">
              <CodeEditor
                code={activeFile.content}
                language={getLang(activeFile.path)}
                filename={activeFile.path.split('/').pop()}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-center">
                <Code2 className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-sm text-slate-500">Select a file from the Explorer to view it here.</p>
              <p className="text-xs text-slate-600">You can then add it to the AI context for analysis.</p>
            </div>
          )}
        </div>

        {/* Panel 3: AI Code Chat */}
        <div className="w-[380px] shrink-0 flex flex-col overflow-hidden">
          <CodeChat attachedFiles={attachedFiles} />
        </div>
      </div>
    </div>
  );
};
