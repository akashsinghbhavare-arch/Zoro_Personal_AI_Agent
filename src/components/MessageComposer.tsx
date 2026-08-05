import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Image as ImageIcon, Camera, Send, Mic, Square } from 'lucide-react';
import { VoiceState } from './MicrophoneVisualizer';

interface MessageComposerProps {
  onSendMessage: (message: string) => void;
  onAddFile: () => void;
  onGenerateImage: () => void;
  onSelectPhoto: () => void;
  voiceState?: VoiceState;
  onMicrophoneClick?: () => void;
  onStopSpeaking?: () => void;
  disabled?: boolean;
}

export const MessageComposer = ({
  onSendMessage, onAddFile, onGenerateImage, onSelectPhoto,
  voiceState = 'idle', onMicrophoneClick, onStopSpeaking, disabled = false,
}: MessageComposerProps) => {
  const [message, setMessage] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef     = useRef<HTMLDivElement>(null);

  const isListening  = voiceState === 'listening';
  const isSpeaking   = voiceState === 'speaking';
  const isProcessing = voiceState === 'processing';
  const canSend      = message.trim().length > 0 && !disabled && !isProcessing;

  /* auto-resize textarea */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [message]);

  /* close menu on outside click */
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    onSendMessage(message.trim());
    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  const handleMicClick = isSpeaking ? (onStopSpeaking ?? onMicrophoneClick) : onMicrophoneClick;

  const menuItems = [
    { icon: FileText,  label: 'Add File',       onClick: () => { onAddFile(); setShowMenu(false); } },
    { icon: ImageIcon, label: 'Generate Image',  onClick: () => { onGenerateImage(); setShowMenu(false); } },
    { icon: Camera,    label: 'Select Photo',    onClick: () => { onSelectPhoto(); setShowMenu(false); } },
  ];

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit}>
        <motion.div
          animate={{
            boxShadow: focused
              ? isListening
                ? '0 0 0 1px rgba(0,191,255,0.5), 0 0 30px rgba(0,191,255,0.15)'
                : '0 0 0 1px rgba(59,130,246,0.4), 0 0 30px rgba(59,130,246,0.1)'
              : '0 0 0 1px rgba(255,255,255,0.06)',
          }}
          transition={{ duration: 0.2 }}
          className="flex items-end gap-2 rounded-[22px] p-3"
          style={{
            background: '#101826',
            border: `1px solid ${
              isListening ? 'rgba(0,191,255,0.4)' :
              isSpeaking  ? 'rgba(59,130,246,0.35)' :
              focused     ? 'rgba(59,130,246,0.3)' :
              'rgba(255,255,255,0.07)'
            }`,
            minHeight: 58,
          }}
        >
          {/* ── Left: Plus menu ─────────────────────────────── */}
          <div className="relative flex-shrink-0" ref={menuRef}>
            <motion.button
              type="button" whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
              onClick={() => setShowMenu(s => !s)}
              className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', color: '#475569' }}
              disabled={disabled}
            >
              <Plus className="w-4 h-4" />
            </motion.button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 mb-2 w-52 rounded-2xl overflow-hidden"
                  style={{
                    background: '#101826',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  }}
                >
                  {menuItems.map((item, i) => (
                    <motion.button
                      key={item.label} type="button"
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={item.onClick}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                      style={{ color: '#94A3B8' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <item.icon className="w-4 h-4" style={{ color: '#3B82F6' }} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Center: Textarea ─────────────────────────────── */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true);
              if (isListening && onMicrophoneClick) {
                onMicrophoneClick(); // Turn off mic when user starts typing/focuses chat
              }
            }}
            onBlur={() => setFocused(false)}
            placeholder={
              isListening  ? 'Listening to you…' :
              isSpeaking   ? 'AI is speaking — tap mic to interrupt…' :
              isProcessing ? 'Thinking…' :
              'Message Nova AI… (Shift+Enter for new line)'
            }
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none py-1.5 text-sm leading-relaxed"
            style={{
              color: '#E2E8F0',
              minHeight: 32,
              maxHeight: 200,
              caretColor: '#00BFFF',
            }}
          />

          {/* ── Right: Voice + Send ──────────────────────────── */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Mic button */}
            {onMicrophoneClick && (
              <motion.button
                type="button"
                whileHover={!isProcessing ? { scale: 1.08 } : {}}
                whileTap={!isProcessing ? { scale: 0.92 } : {}}
                onClick={handleMicClick}
                disabled={isProcessing || disabled}
                title={isListening ? 'Stop' : isSpeaking ? 'Interrupt' : 'Voice input'}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{
                  background: isListening
                    ? 'rgba(0,191,255,0.2)'
                    : isSpeaking
                    ? 'rgba(59,130,246,0.2)'
                    : 'rgba(255,255,255,0.05)',
                  border: isListening
                    ? '1px solid rgba(0,191,255,0.4)'
                    : isSpeaking
                    ? '1px solid rgba(59,130,246,0.3)'
                    : '1px solid transparent',
                  color: isListening ? '#00BFFF' : isSpeaking ? '#3B82F6' : '#475569',
                  boxShadow: isListening ? '0 0 12px rgba(0,191,255,0.2)' : 'none',
                }}
              >
                <AnimatePresence mode="wait">
                  {isProcessing ? (
                    <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent"
                      style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#94A3B8', animation: 'spin 0.8s linear infinite' }}
                    />
                  ) : isSpeaking ? (
                    <motion.div key="sq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Square className="w-3.5 h-3.5" fill="currentColor" />
                    </motion.div>
                  ) : (
                    <motion.div key="m" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <Mic className="w-4 h-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            )}

            {/* Send button */}
            <motion.button
              type="submit"
              whileHover={canSend ? { scale: 1.05, boxShadow: '0 0 20px rgba(0,191,255,0.4)' } : {}}
              whileTap={canSend ? { scale: 0.93 } : {}}
              disabled={!canSend}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: canSend
                  ? 'linear-gradient(135deg, #00BFFF, #3B82F6)'
                  : 'rgba(255,255,255,0.05)',
                color: canSend ? '#fff' : '#334155',
                boxShadow: canSend ? '0 0 16px rgba(0,191,255,0.3)' : 'none',
              }}
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      </form>

      {/* Hint text */}
      <p className="text-center mt-2 text-[10px]" style={{ color: '#1e293b' }}>
        Nova AI can make mistakes. Consider checking important information.
      </p>
    </div>
  );
};
