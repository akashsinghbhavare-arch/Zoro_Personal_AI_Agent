import { motion, AnimatePresence } from 'framer-motion';
import { Message } from '../types';
import { TypingIndicator } from './TypingIndicator';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Copy, ThumbsUp, ThumbsDown, Share2, Volume2, Check, Bot, User as UserIcon, Sparkles } from 'lucide-react';

interface ChatViewProps {
  messages: Message[];
  isTyping?: boolean;
}

const ActionBtn = ({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) => (
  <motion.button
    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
    onClick={onClick}
    title={label}
    className="p-1.5 rounded-lg transition-colors"
    style={{ color: '#475569' }}
    onMouseEnter={e => (e.currentTarget.style.color = '#94A3B8')}
    onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
  >
    <Icon className="w-3.5 h-3.5" />
  </motion.button>
);

// ── Smart message content renderer ──────────────────────────────────────────
// Parses markdown images, bold, inline code, code blocks into React elements.
const MessageContent = ({ content }: { content: string }) => {
  const [imgLoaded, setImgLoaded] = useState<Record<string, boolean>>({});
  const [imgError, setImgError] = useState<Record<string, boolean>>({});

  // Split content into segments: images, code blocks, and plain text
  const segments: Array<{ type: 'img' | 'code' | 'text'; value: string; alt?: string }> = [];

  // Match ![alt](url) and ```code blocks``` first
  const pattern = /(!?\[([^\]]*)\]\(([^)]+)\))|```([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (match.index > last) {
      segments.push({ type: 'text', value: content.slice(last, match.index) });
    }
    if (match[0].startsWith('!')) {
      // Image: ![alt](url)
      segments.push({ type: 'img', value: match[3], alt: match[2] || 'Generated image' });
    } else if (match[0].startsWith('```')) {
      // Code block
      segments.push({ type: 'code', value: match[4] });
    }
    last = match.index + match[0].length;
  }
  if (last < content.length) {
    segments.push({ type: 'text', value: content.slice(last) });
  }

  const renderText = (text: string) => {
    // Render **bold** and `inline code`
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1 rounded text-xs" style={{ background: 'rgba(255,255,255,0.1)', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="space-y-2">
      {segments.map((seg, i) => {
        if (seg.type === 'img') {
          const loaded = imgLoaded[seg.value];
          const errored = imgError[seg.value];
          return (
            <div key={i} className="rounded-2xl overflow-hidden my-1" style={{ maxWidth: 420 }}>
              {!loaded && !errored && (
                <div
                  className="relative w-full rounded-2xl p-6 border border-cyan-500/30 overflow-hidden flex flex-col items-center justify-center gap-3 shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(16,24,38,0.98))',
                    minHeight: 220,
                    maxWidth: 420,
                  }}
                >
                  {/* Background animated gradient pulse */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-violet-500/10 to-blue-500/10 animate-pulse" />

                  {/* Rotating AI Sparkle Icon */}
                  <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                    <Sparkles className="w-6 h-6 text-cyan-400 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>

                  {/* Status & prompt text */}
                  <div className="relative z-10 text-center space-y-1">
                    <div className="text-sm font-semibold text-cyan-300 flex items-center justify-center gap-1.5">
                      <span>🎨 Generating AI Image...</span>
                    </div>
                    {seg.alt && (
                      <p className="text-xs text-slate-400 max-w-[300px] truncate italic">
                        "{seg.alt}"
                      </p>
                    )}
                  </div>

                  {/* Animated progress bar */}
                  <div className="relative z-10 w-52 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 via-violet-500 to-blue-500 rounded-full animate-pulse"
                      style={{ width: '85%', animationDuration: '1.2s' }}
                    />
                  </div>

                  <span className="relative z-10 text-[10px] text-slate-500 font-medium">
                    NVIDIA NIM Engine • Ultra High Speed
                  </span>
                </div>
              )}
              {errored && (
                <div className="w-full h-24 flex items-center justify-center rounded-xl text-xs p-4 border border-red-500/20" style={{ background: 'rgba(255,0,0,0.08)', color: '#f87171' }}>
                  ⚠️ Image failed to generate. Please try again.
                </div>
              )}
              <img
                src={seg.value}
                alt={seg.alt}
                title={seg.alt}
                className={`w-full rounded-2xl object-cover transition-all duration-500 shadow-lg ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 h-0'}`}
                style={{ maxWidth: 420, display: errored ? 'none' : 'block' }}
                onLoad={() => setImgLoaded(prev => ({ ...prev, [seg.value]: true }))}
                onError={() => setImgError(prev => ({ ...prev, [seg.value]: true }))}
              />
              {seg.alt && loaded && (
                <p className="text-xs mt-1.5 px-1 italic font-medium flex items-center gap-1" style={{ color: '#64748b' }}>
                  <span>🎨</span> {seg.alt}
                </p>
              )}
            </div>
          );
        }
        if (seg.type === 'code') {
          return (
            <pre key={i} className="p-3 rounded-xl text-xs overflow-x-auto" style={{ background: 'rgba(0,0,0,0.4)', color: '#e2e8f0', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
              {seg.value}
            </pre>
          );
        }
        // Plain text with inline formatting
        return (
          <p key={i} className="whitespace-pre-wrap break-words leading-relaxed">
            {renderText(seg.value)}
          </p>
        );
      })}
    </div>
  );
};


const MessageBubble = ({ message }: { message: Message; isLast?: boolean }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [_liked, setLiked] = useState<boolean | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(message.content);
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} group`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #3B82F6)' }}
          >
            <UserIcon className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #00BFFF22, #3B82F622)',
              border: '1px solid rgba(0,191,255,0.25)',
              boxShadow: '0 0 12px rgba(0,191,255,0.1)',
            }}
          >
            <Bot className="w-3.5 h-3.5" style={{ color: '#00BFFF' }} />
          </div>
        )}
      </div>

      <div className={`flex flex-col gap-1 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Bubble */}
        <div
          className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
          style={isUser ? {
            background: 'linear-gradient(135deg, #0ea5e9 0%, #3B82F6 100%)',
            color: '#fff',
            borderRadius: '18px 4px 18px 18px',
            boxShadow: '0 4px 20px rgba(0,191,255,0.2)',
          } : {
            background: '#101826',
            color: '#E2E8F0',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px 18px 18px 18px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <MessageContent content={message.content} />
        </div>

        {/* Timestamp + actions */}
        <div className={`flex items-center gap-2 px-1 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <span className="text-[10px]" style={{ color: '#334155' }}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Action buttons — visible on hover for assistant, always for user */}
          <AnimatePresence>
            {!isUser && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ActionBtn icon={copied ? Check : Copy} label="Copy" onClick={handleCopy} />
                <ActionBtn
                  icon={ThumbsUp} label="Like"
                  onClick={() => setLiked(true)}
                />
                <ActionBtn
                  icon={ThumbsDown} label="Dislike"
                  onClick={() => setLiked(false)}
                />
                <ActionBtn icon={Volume2} label="Read aloud" onClick={handleSpeak} />
                <ActionBtn icon={Share2}  label="Share"      onClick={() => {}} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export const ChatView = ({ messages, isTyping = false }: ChatViewProps) => {
  const scrollRef  = useRef<HTMLDivElement>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll]   = useState(true);
  const [showJump, setShowJump]       = useState(false);
  const programmaticRef               = useRef(false);
  const scrollTimerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollRef.current;
    if (!el) return;
    programmaticRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setTimeout(() => { programmaticRef.current = false; }, 400);
  }, []);

  const handleScroll = useCallback(() => {
    if (programmaticRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (dist < 40) { setAutoScroll(true); setShowJump(false); }
    else {
      setAutoScroll(false); setShowJump(true);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => setAutoScroll(true), 2000);
    }
  }, []);

  useEffect(() => { if (autoScroll) scrollToBottom('smooth'); }, [messages, isTyping]);
  useEffect(() => { scrollToBottom('instant' as ScrollBehavior); }, []);
  useEffect(() => () => { if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current); }, []);

  return (
    <div className="relative flex-1 overflow-hidden">
      <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto px-6 py-6 space-y-5">
        {messages.map((msg, i) => (
          <MessageBubble key={msg.id} message={msg} isLast={i === messages.length - 1} />
        ))}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,191,255,0.1)', border: '1px solid rgba(0,191,255,0.2)' }}
            >
              <Bot className="w-3.5 h-3.5" style={{ color: '#00BFFF' }} />
            </div>
            <div
              className="px-4 py-3 rounded-2xl"
              style={{ background: '#101826', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <TypingIndicator />
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Jump to bottom pill */}
      <motion.button
        animate={{ opacity: showJump ? 1 : 0, y: showJump ? 0 : 10, pointerEvents: showJump ? 'auto' : 'none' }}
        transition={{ duration: 0.2 }}
        onClick={() => { setAutoScroll(true); setShowJump(false); scrollToBottom('smooth'); }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all"
        style={{
          background: 'rgba(16,24,38,0.95)',
          border: '1px solid rgba(0,191,255,0.25)',
          color: '#00BFFF',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}
      >
        ↓ Latest message
      </motion.button>
    </div>
  );
};
