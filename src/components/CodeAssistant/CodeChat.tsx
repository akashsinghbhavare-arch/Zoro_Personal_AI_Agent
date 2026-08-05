import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Loader2, Copy, Check, Trash2, Sparkles } from 'lucide-react';
import { CodeEditor } from './CodeEditor';

type Mode = 'ask' | 'generate' | 'debug' | 'fix' | 'explain' | 'refactor' | 'review' | 'optimize' | 'convert';

const MODES: { id: Mode; label: string; icon: string; desc: string }[] = [
  { id: 'ask',      label: 'Ask',      icon: '💬', desc: 'Ask any programming question' },
  { id: 'generate', label: 'Generate', icon: '⚡', desc: 'Generate code from description' },
  { id: 'debug',    label: 'Debug',    icon: '🐛', desc: 'Analyze errors & find root cause' },
  { id: 'fix',      label: 'Fix',      icon: '🔧', desc: 'Fix bugs in provided code' },
  { id: 'explain',  label: 'Explain',  icon: '📖', desc: 'Explain code line-by-line' },
  { id: 'refactor', label: 'Refactor', icon: '🔄', desc: 'Improve code quality' },
  { id: 'review',   label: 'Review',   icon: '🔍', desc: 'Security & quality review' },
  { id: 'optimize', label: 'Optimize', icon: '🚀', desc: 'Performance optimization' },
  { id: 'convert',  label: 'Convert',  icon: '🔀', desc: 'Convert between languages' },
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CodeChatProps {
  attachedFiles?: { path: string; content: string }[];
}

// Parse markdown-style code blocks out of AI responses
function parseContent(content: string): Array<{ type: 'text' | 'code'; text?: string; code?: string; lang?: string }> {
  const parts: Array<{ type: 'text' | 'code'; text?: string; code?: string; lang?: string }> = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', text: content.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'code', lang: match[1] || 'text', code: match[2] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    parts.push({ type: 'text', text: content.slice(lastIndex) });
  }
  return parts;
}

function TextContent({ text }: { text: string }) {
  // Basic markdown: bold, inline code
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-slate-700 text-cyan-300 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
    .replace(/\n/g, '<br/>');
  return <p className="text-slate-300 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const parts = parseContent(msg.content);

  const copyAll = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm text-white leading-relaxed whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 group">
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-violet-500/20">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="space-y-2">
          {parts.map((part, i) =>
            part.type === 'code'
              ? <CodeEditor key={i} code={part.code || ''} language={part.lang || 'text'} />
              : <TextContent key={i} text={part.text || ''} />
          )}
        </div>
        <button
          onClick={copyAll}
          className="mt-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition-all"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy response'}
        </button>
      </div>
    </div>
  );
}

export const CodeChat = ({ attachedFiles = [] }: CodeChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('ask');
  const [isLoading, setIsLoading] = useState(false);
  const [showModes, setShowModes] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const currentMode = MODES.find(m => m.id === mode)!;

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/code-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          mode,
          files: attachedFiles,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      let reply = '';

      if (response.ok) {
        const data = await response.json();
        reply = data.success ? data.reply : `Error: ${data.error?.message}`;
      } else {
        // Fallback: call Groq directly from frontend (graceful degradation)
        const groqKeys = [import.meta.env.VITE_GROQ_DEFAULT_API_KEY].filter(Boolean);
        const key = groqKeys[Math.floor(Math.random() * groqKeys.length)];
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are an expert programming assistant. Use code blocks with language labels for all code.' },
              ...messages.slice(-4).map(m => ({ role: m.role, content: m.content })),
              { role: 'user', content: trimmed },
            ],
            temperature: 0.3, max_tokens: 4096,
          }),
        });
        const groqData = await groqRes.json();
        reply = groqData?.choices?.[0]?.message?.content || 'Unable to get a response. Please try again.';
      }

      const aiMsg: ChatMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('[CodeChat] Error:', err);
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: 'Unable to connect to the AI service. Please ensure the backend server is running (`node server/index.js`).',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/40">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white leading-tight">AI Code Assistant</h3>
            <p className="text-[11px] text-slate-500">Powered by Llama 3.3-70B</p>
          </div>
        </div>
        <button
          onClick={() => setMessages([])}
          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="px-3 py-2 border-b border-slate-800 shrink-0">
        <div className="relative">
          <button
            onClick={() => setShowModes(m => !m)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 rounded-xl text-xs transition-colors w-full justify-between"
          >
            <span className="flex items-center gap-2">
              <span>{currentMode.icon}</span>
              <span className="font-semibold text-white">{currentMode.label}</span>
              <span className="text-slate-400">{currentMode.desc}</span>
            </span>
            <span className="text-slate-500">▾</span>
          </button>
          <AnimatePresence>
            {showModes && (
              <motion.div
                initial={{ opacity: 0, y: -5, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.97 }}
                className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl overflow-hidden z-20 shadow-2xl"
              >
                {MODES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setMode(m.id); setShowModes(false); }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-slate-800 transition-colors ${mode === m.id ? 'bg-slate-800 text-cyan-300' : 'text-slate-300'}`}
                  >
                    <span>{m.icon}</span>
                    <span className="font-medium">{m.label}</span>
                    <span className="text-slate-500">{m.desc}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-slate-700 flex items-center justify-center">
              <span className="text-2xl">{currentMode.icon}</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-300">{currentMode.label} Mode</h3>
            <p className="text-xs text-slate-500 max-w-xs">{currentMode.desc}. Type your prompt below and press Enter.</p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-xs mt-2">
              {[
                mode === 'ask' ? 'Explain async/await in JavaScript' : undefined,
                mode === 'generate' ? 'Create a Node.js REST API for users' : undefined,
                mode === 'debug' ? "Why am I getting 'Cannot read property of undefined'?" : undefined,
                mode === 'review' ? 'Review this API for security vulnerabilities' : undefined,
              ].filter(Boolean).map(hint => (
                <button
                  key={hint}
                  onClick={() => setInput(hint!)}
                  className="text-xs text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 rounded-lg px-3 py-2 text-left transition-colors"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span className="text-xs text-slate-500">Analyzing and generating response...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-800 shrink-0">
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachedFiles.map(f => (
              <span key={f.path} className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] rounded-full">
                {f.path.split('/').pop()}
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-end bg-slate-800/50 rounded-2xl border border-slate-700/60 focus-within:border-cyan-500/50 transition-colors p-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={`${currentMode.icon} ${currentMode.desc}...`}
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 resize-none outline-none py-1 px-1 min-h-[36px] max-h-[120px]"
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 text-white transition-all disabled:opacity-40 hover:scale-105 shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-slate-600 text-center mt-1.5">⏎ Send &nbsp;·&nbsp; ⇧⏎ New line</p>
      </div>
    </div>
  );
};
