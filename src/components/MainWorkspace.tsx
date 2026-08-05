import { motion } from 'framer-motion';
import { AIOrb } from './AIOrb';
import { MessageComposer } from './MessageComposer';
import { ChatView } from './ChatView';
import { Menu, Sparkles, Code2, Image, Globe, FileText, Bell, Mail, BarChart2 } from 'lucide-react';
import { Message } from '../types';
import { VoiceState } from './MicrophoneVisualizer';

interface MainWorkspaceProps {
  agentName: string;
  voiceState: VoiceState;
  onMicrophoneClick: () => void;
  onStopSpeaking: () => void;
  onSendMessage: (message: string) => void;
  onAddFile: () => void;
  onGenerateImage: () => void;
  onSelectPhoto: () => void;
  onPDFReader?: () => void;
  messages: Message[];
  isTyping?: boolean;
  onToggleSidebar?: () => void;
  userName?: string;
}

const ACTION_CARDS = [
  { icon: Code2,     label: 'Create Code',     desc: 'Write, review, debug', cmd: '/code Write a React component', color: '#3B82F6' },
  { icon: Image,     label: 'Generate Image',  desc: 'AI image creation',    cmd: '/image A futuristic city at night', color: '#00BFFF' },
  { icon: Globe,     label: 'Search Web',      desc: 'Real-time answers',    cmd: 'Search the web for: ', color: '#22C55E' },
  { icon: FileText,  label: 'Summarize PDF',   desc: 'Extract key insights', cmd: '__PDF_READER__', color: '#F59E0B' },
  { icon: Mail,      label: 'Write Email',     desc: 'Professional copy',    cmd: 'Write a professional email about: ', color: '#3B82F6' },
  { icon: BarChart2, label: 'Analyze Data',    desc: 'Charts & insights',    cmd: 'Analyze this data: ', color: '#00BFFF' },
  { icon: Bell,      label: 'Set Reminder',    desc: 'Smart scheduling',     cmd: 'Set a reminder for: ', color: '#22C55E' },
  { icon: Sparkles,  label: 'Brainstorm',      desc: 'Creative ideas',       cmd: 'Help me brainstorm: ', color: '#F59E0B' },
];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const AIStatusBar = ({ voiceState }: { voiceState: VoiceState }) => {
  const states = {
    idle:       { dot: '#22C55E', text: 'Ready',      label: '🟢' },
    listening:  { dot: '#00BFFF', text: 'Listening',  label: '🔵' },
    processing: { dot: '#F59E0B', text: 'Thinking',   label: '🟡' },
    speaking:   { dot: '#22C55E', text: 'Responding', label: '🟢' },
  };
  const s = states[voiceState];
  return (
    <motion.div
      key={voiceState}
      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5"
    >
      <motion.div
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: s.dot }}
        animate={{ opacity: voiceState !== 'idle' ? [1, 0.4, 1] : 1 }}
        transition={{ duration: 1.2, repeat: voiceState !== 'idle' ? Infinity : 0 }}
      />
      <span className="text-xs font-medium" style={{ color: '#94A3B8' }}>{s.text}</span>
    </motion.div>
  );
};

export const MainWorkspace = ({
  agentName, voiceState, onMicrophoneClick, onStopSpeaking,
  onSendMessage, onAddFile, onGenerateImage, onSelectPhoto, onPDFReader,
  messages, isTyping = false, onToggleSidebar, userName = 'User',
}: MainWorkspaceProps) => {
  const hasMessages = messages.length > 0;
  // Strict view persistence: no automatic switching between Chat and Mic views
  const showChatView = hasMessages;
  const greeting = getGreeting();

  const handleActionCard = (cmd: string) => {
    if (cmd === '__PDF_READER__' && onPDFReader) {
      onPDFReader();
    } else {
      onSendMessage(cmd);
    }
  };

  return (
    <div
      className="flex-1 flex flex-col h-screen overflow-hidden"
      style={{ background: '#070D18' }}
    >
      {/* ── Header ───────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 py-3.5 flex-shrink-0"
        style={{
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(7,13,24,0.8)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg transition-colors"
              style={{ color: '#94A3B8' }}
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2"
        >
          <div
            className="px-3 py-1 rounded-full text-sm font-medium"
            style={{
              background: 'rgba(0,191,255,0.08)',
              border: '1px solid rgba(0,191,255,0.15)',
              color: '#00BFFF',
            }}
          >
            {agentName}
          </div>
        </motion.div>

        <AIStatusBar voiceState={voiceState} />
      </header>

      {/* ── Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showChatView ? (
          <ChatView messages={messages} isTyping={isTyping} />
        ) : (
          /* Dashboard / Empty state */
          <div className="flex-1 overflow-y-auto">
            <div className="px-8 py-10 max-w-3xl mx-auto w-full">

              {/* Greeting */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className="mb-10 text-center"
              >
                <div className="text-sm font-medium mb-1" style={{ color: '#94A3B8' }}>{greeting},</div>
                <h1
                  className="text-4xl font-bold mb-3"
                  style={{
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #94A3B8 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Hi {userName} 👋
                </h1>
                <p className="text-base" style={{ color: '#475569' }}>
                  How can I help you today?
                </p>
              </motion.div>

              {/* AI Orb */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="flex justify-center mb-12"
              >
                <AIOrb
                  voiceState={voiceState}
                  onClick={onMicrophoneClick}
                  onStopSpeaking={onStopSpeaking}
                />
              </motion.div>

              {/* Action cards */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: '#334155' }}>
                  Quick Actions
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {ACTION_CARDS.map((card, i) => (
                    <motion.button
                      key={card.label}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.04 }}
                      whileHover={{ y: -2, boxShadow: `0 8px 30px rgba(0,0,0,0.3)` }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => handleActionCard(card.cmd)}
                      className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all"
                      style={{
                        background: '#101826',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: `${card.color}18` }}
                      >
                        <card.icon className="w-4 h-4" style={{ color: card.color }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white leading-tight">{card.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: '#475569' }}>{card.desc}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* ── Composer ─────────────────────────────────────────── */}
        <div
          className="flex-shrink-0 px-6 py-4"
          style={{
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(7,13,24,0.7)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <MessageComposer
            onSendMessage={onSendMessage}
            onAddFile={onAddFile}
            onGenerateImage={onGenerateImage}
            onSelectPhoto={onSelectPhoto}
            voiceState={voiceState}
            onMicrophoneClick={onMicrophoneClick}
            onStopSpeaking={onStopSpeaking}
          />
        </div>
      </div>
    </div>
  );
};
