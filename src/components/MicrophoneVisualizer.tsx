import { motion, AnimatePresence } from 'framer-motion';

// Voice state: idle | listening | processing | speaking
export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

interface MicrophoneVisualizerProps {
  voiceState: VoiceState;
  onClick: () => void;
  onStopSpeaking?: () => void;
}

// ── Ripple ring for speaking / listening ───────────────────────────────────
const Ring = ({
  delay,
  size,
  color,
}: {
  delay: number;
  size: number;
  color: string;
}) => (
  <motion.div
    className="absolute rounded-full border"
    style={{
      width: size,
      height: size,
      borderColor: color,
    }}
    initial={{ opacity: 0.7, scale: 0.9 }}
    animate={{ opacity: 0, scale: 1.6 }}
    transition={{
      duration: 1.6,
      delay,
      repeat: Infinity,
      ease: 'easeOut',
    }}
  />
);

// ── Orbital arc for listening ─────────────────────────────────────────────
const Arc = ({ delay, cw }: { delay: number; cw: boolean }) => (
  <motion.div
    className="absolute w-48 h-48"
    animate={{ rotate: cw ? 360 : -360 }}
    transition={{ duration: cw ? 7 : 9, repeat: Infinity, ease: 'linear', delay }}
  >
    <svg className="w-full h-full" viewBox="0 0 120 120">
      <circle
        cx="60"
        cy="60"
        r="54"
        fill="none"
        stroke="url(#arcGrad)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="80 260"
      />
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  </motion.div>
);

// ── Sound-bar for speaking ────────────────────────────────────────────────
const SoundBars = () => {
  const bars = [0.4, 0.7, 1, 0.85, 0.6, 0.9, 0.5];
  return (
    <div className="flex items-center gap-[3px]">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-gradient-to-t from-violet-500 to-cyan-400"
          style={{ height: 8 }}
          animate={{ scaleY: [h * 0.4, h, h * 0.5, h * 0.9, h * 0.3] }}
          transition={{
            duration: 0.8,
            delay: i * 0.08,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export const MicrophoneVisualizer = ({
  voiceState,
  onClick,
  onStopSpeaking,
}: MicrophoneVisualizerProps) => {
  const isListening = voiceState === 'listening';
  const isProcessing = voiceState === 'processing';
  const isSpeaking = voiceState === 'speaking';

  // Label & colours per state
  const stateLabel =
    isListening ? 'Listening…' :
    isProcessing ? 'Thinking…' :
    isSpeaking ? 'Speaking…' :
    'Tap to speak';

  const glowColor =
    isListening ? 'rgba(139,92,246,0.5)' :
    isSpeaking  ? 'rgba(6,182,212,0.45)' :
    'rgba(100,116,139,0.2)';

  const borderColor =
    isListening ? '#8b5cf6' :
    isSpeaking  ? '#06b6d4' :
    '#334155';

  return (
    <div className="relative flex flex-col items-center gap-6 select-none">
      {/* ── Ring effects ─────────────────────────────────── */}
      <AnimatePresence>
        {isListening && (
          <>
            <Ring key="r1" delay={0}   size={148} color="rgba(139,92,246,0.4)" />
            <Ring key="r2" delay={0.5} size={148} color="rgba(59,130,246,0.3)" />
            <Arc  key="a1" delay={0}   cw={true}  />
            <Arc  key="a2" delay={0.4} cw={false} />
          </>
        )}
        {isSpeaking && (
          <>
            <Ring key="sr1" delay={0}    size={148} color="rgba(6,182,212,0.45)" />
            <Ring key="sr2" delay={0.55} size={148} color="rgba(139,92,246,0.3)" />
            <Ring key="sr3" delay={1.1}  size={148} color="rgba(6,182,212,0.2)" />
          </>
        )}
      </AnimatePresence>

      {/* ── Ambient glow blob ─────────────────────────────── */}
      <motion.div
        className="absolute w-36 h-36 rounded-full blur-2xl"
        animate={{ backgroundColor: glowColor }}
        transition={{ duration: 0.6 }}
      />

      {/* ── Main button ───────────────────────────────────── */}
      <motion.button
        whileHover={voiceState === 'idle' ? { scale: 1.06 } : {}}
        whileTap={{ scale: 0.94 }}
        onClick={isSpeaking ? onStopSpeaking : onClick}
        aria-label={stateLabel}
        className="relative z-10 w-28 h-28 rounded-full flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        style={{
          background:
            'linear-gradient(135deg, rgba(30,41,59,0.9) 0%, rgba(15,23,42,0.95) 100%)',
          boxShadow: `0 0 0 2px ${borderColor}, 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <AnimatePresence mode="wait">

          {/* Processing spinner */}
          {isProcessing && (
            <motion.div
              key="proc"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
              className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin"
            />
          )}

          {/* Speaking — sound bars */}
          {isSpeaking && (
            <motion.div
              key="speak"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              <SoundBars />
            </motion.div>
          )}

          {/* Idle / Listening — mic SVG */}
          {!isProcessing && !isSpeaking && (
            <motion.svg
              key="mic"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.2 }}
              viewBox="0 0 24 24"
              fill="none"
              className="w-9 h-9"
            >
              <rect x="9" y="2" width="6" height="12" rx="3"
                fill={isListening ? '#a78bfa' : '#94a3b8'} />
              <path
                d="M5 10a7 7 0 0 0 14 0"
                stroke={isListening ? '#a78bfa' : '#94a3b8'}
                strokeWidth="2" strokeLinecap="round"
              />
              <line
                x1="12" y1="19" x2="12" y2="22"
                stroke={isListening ? '#a78bfa' : '#94a3b8'}
                strokeWidth="2" strokeLinecap="round"
              />
              <line
                x1="9" y1="22" x2="15" y2="22"
                stroke={isListening ? '#a78bfa' : '#94a3b8'}
                strokeWidth="2" strokeLinecap="round"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Sound bars below button when speaking ──────────── */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.div
            key="bars-ext"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-1"
          >
            {[0.5, 0.9, 0.7, 1, 0.6, 0.85, 0.45, 0.8, 0.55].map((h, i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-violet-400 opacity-70"
                style={{ height: 4 }}
                animate={{ scaleY: [h * 0.3, h, h * 0.4, h * 0.8, h * 0.2] }}
                transition={{
                  duration: 1,
                  delay: i * 0.06,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── State label ────────────────────────────────────── */}
      <motion.p
        key={voiceState}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`text-sm font-medium tracking-wide ${
          isListening  ? 'text-violet-400' :
          isSpeaking   ? 'text-cyan-400' :
          isProcessing ? 'text-blue-400' :
          'text-slate-500'
        }`}
      >
        {stateLabel}
      </motion.p>

      {/* ── "Tap button to interrupt" hint when speaking ───── */}
      <AnimatePresence>
        {isSpeaking && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-slate-600 -mt-4"
          >
            Tap to interrupt
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};
