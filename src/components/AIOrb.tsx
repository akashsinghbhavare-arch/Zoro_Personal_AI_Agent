import { motion, AnimatePresence } from 'framer-motion';
import { VoiceState } from './MicrophoneVisualizer';

interface AIOrbProps {
  voiceState: VoiceState;
  onClick: () => void;
  onStopSpeaking?: () => void;
}

const WAVE_BARS = [0.4, 0.7, 1, 0.85, 0.55, 0.9, 0.65, 1, 0.5, 0.75, 0.4];

export const AIOrb = ({ voiceState, onClick, onStopSpeaking }: AIOrbProps) => {
  const isListening  = voiceState === 'listening';
  const isSpeaking   = voiceState === 'speaking';
  const isProcessing = voiceState === 'processing';

  const handleClick = isSpeaking ? (onStopSpeaking ?? onClick) : onClick;

  const label =
    isListening  ? 'Listening…' :
    isProcessing ? 'Thinking…' :
    isSpeaking   ? 'Speaking — tap to interrupt' :
    'Tap to speak';

  return (
    <div className="flex flex-col items-center gap-6 select-none">
      {/* ── Orb ──────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center">
        {/* Outer halo rings */}
        {(isListening || isSpeaking) && (
          <>
            {[1, 2, 3].map(i => (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width:  140 + i * 44,
                  height: 140 + i * 44,
                  border: `1px solid ${isListening ? 'rgba(0,191,255,' : 'rgba(59,130,246,'}${0.22 / i})`,
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0.6, 0, 0.6], scale: [0.9, 1.1 + i * 0.05, 0.9] }}
                transition={{ duration: 2 + i * 0.4, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </>
        )}

        {/* Slow rotating ring */}
        <motion.div
          className="absolute w-36 h-36 rounded-full"
          style={{ border: '1px solid rgba(0,191,255,0.15)' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
            style={{ background: '#00BFFF', boxShadow: '0 0 8px #00BFFF' }}
          />
        </motion.div>

        {/* Counter-rotating ring */}
        <motion.div
          className="absolute w-28 h-28 rounded-full"
          style={{ border: '1px solid rgba(59,130,246,0.2)' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        >
          <div
            className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full"
            style={{ background: '#3B82F6', boxShadow: '0 0 6px #3B82F6' }}
          />
        </motion.div>

        {/* Core orb button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.93 }}
          onClick={handleClick}
          aria-label={label}
          className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center outline-none cursor-pointer ${isListening ? 'orb-listening' : 'orb-idle'}`}
          style={{
            background: isListening
              ? 'radial-gradient(circle at 35% 35%, #0ea5e9, #0369a1)'
              : isSpeaking
              ? 'radial-gradient(circle at 35% 35%, #1d4ed8, #1e3a8a)'
              : isProcessing
              ? 'radial-gradient(circle at 35% 35%, #0f172a, #1e293b)'
              : 'radial-gradient(circle at 35% 35%, #0c1a2e, #070D18)',
            border: `1px solid ${isListening ? 'rgba(0,191,255,0.5)' : isSpeaking ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          <AnimatePresence mode="wait">
            {isProcessing ? (
              <motion.div
                key="spinner"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="w-8 h-8 rounded-full border-2 border-t-transparent"
                style={{
                  borderColor: 'rgba(0,191,255,0.2)',
                  borderTopColor: '#00BFFF',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
            ) : isSpeaking ? (
              <motion.div
                key="waves"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-0.5"
              >
                {WAVE_BARS.slice(0, 5).map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full"
                    style={{ background: '#3B82F6', height: 6 }}
                    animate={{ scaleY: [h * 0.3, h, h * 0.5] }}
                    transition={{ duration: 0.7, delay: i * 0.1, repeat: Infinity, ease: 'easeInOut' }}
                  />
                ))}
              </motion.div>
            ) : (
              /* Mic icon */
              <motion.svg
                key="mic"
                initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                viewBox="0 0 24 24" fill="none"
                className="w-9 h-9"
              >
                <rect x="9" y="2" width="6" height="12" rx="3"
                  fill={isListening ? '#00BFFF' : 'rgba(255,255,255,0.6)'}
                  style={{ filter: isListening ? 'drop-shadow(0 0 6px #00BFFF)' : 'none' }}
                />
                <path d="M5 10a7 7 0 0 0 14 0"
                  stroke={isListening ? '#00BFFF' : 'rgba(255,255,255,0.6)'}
                  strokeWidth="2" strokeLinecap="round"
                />
                <line x1="12" y1="19" x2="12" y2="22"
                  stroke={isListening ? '#00BFFF' : 'rgba(255,255,255,0.4)'}
                  strokeWidth="2" strokeLinecap="round"
                />
                <line x1="9" y1="22" x2="15" y2="22"
                  stroke={isListening ? '#00BFFF' : 'rgba(255,255,255,0.4)'}
                  strokeWidth="2" strokeLinecap="round"
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* ── Sound wave bars when speaking ────────────────────── */}
      <AnimatePresence>
        {(isListening || isSpeaking) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
            className="flex items-end gap-1"
            style={{ height: 28 }}
          >
            {WAVE_BARS.map((h, i) => (
              <motion.div
                key={i}
                className="w-1 rounded-full"
                style={{
                  background: isListening
                    ? `rgba(0,191,255,${0.4 + h * 0.5})`
                    : `rgba(59,130,246,${0.4 + h * 0.5})`,
                  minHeight: 3,
                  height: 28 * h,
                }}
                animate={{ scaleY: [0.2, 1, 0.3, 0.8, 0.1] }}
                transition={{ duration: 1.2, delay: i * 0.07, repeat: Infinity, ease: 'easeInOut' }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Label ────────────────────────────────────────────── */}
      <motion.div
        key={voiceState}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-sm font-medium text-center"
        style={{
          color: isListening ? '#00BFFF' : isSpeaking ? '#3B82F6' : isProcessing ? '#94A3B8' : '#475569',
        }}
      >
        {label}
      </motion.div>
    </div>
  );
};
