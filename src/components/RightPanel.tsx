import { motion } from 'framer-motion';
import {
  Globe, FileText, Calculator, Pen, Languages, Bot, PlayCircle,
  GitBranch, Terminal, Database, Globe2, Image, Zap,
  Bell, BarChart2, TrendingUp, Cpu,
} from 'lucide-react';
import { Conversation } from '../types';

interface RightPanelProps {
  userName?: string;
  conversations?: Conversation[];
  onSendMessage?: (msg: string) => void;
}

const TOOLS = [
  { icon: Globe,        label: 'Web Search',   cmd: 'Search the web for: ',       color: '#3B82F6' },
  { icon: FileText,     label: 'PDF Reader',   cmd: 'Summarize this PDF: ',        color: '#22C55E' },
  { icon: Calculator,   label: 'Calculator',   cmd: 'Calculate: ',                 color: '#F59E0B' },
  { icon: Pen,          label: 'AI Writer',    cmd: 'Write an article about: ',    color: '#00BFFF' },
  { icon: Languages,    label: 'Translator',   cmd: 'Translate to Hindi: ',        color: '#3B82F6' },
  { icon: Image,        label: 'Image Gen',    cmd: 'Generate an image of: ',      color: '#22C55E' },
  { icon: PlayCircle,   label: 'YT Summarize', cmd: 'Summarize YouTube video: ',   color: '#EF4444' },
  { icon: GitBranch,    label: 'GitHub Asst',  cmd: 'Help with Git repository: ',  color: '#94A3B8' },
  { icon: Terminal,     label: 'Terminal',     cmd: 'Run command: ',               color: '#22C55E' },
  { icon: Database,     label: 'DB Explorer',  cmd: 'Query database: ',            color: '#F59E0B' },
  { icon: Globe2,       label: 'API Tester',   cmd: 'Test API endpoint: ',         color: '#00BFFF' },
  { icon: Bot,          label: 'OCR Tool',     cmd: 'Extract text from image: ',   color: '#3B82F6' },
];

const StatCard = ({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string; color: string; sub?: string;
}) => (
  <div
    className="flex items-center gap-3 p-3 rounded-xl"
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
  >
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: `${color}18` }}
    >
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-xs font-medium" style={{ color: '#94A3B8' }}>{label}</div>
      {sub && <div className="text-[10px]" style={{ color: '#334155' }}>{sub}</div>}
    </div>
    <div className="text-sm font-bold text-white">{value}</div>
  </div>
);

export const RightPanel = ({ userName: _userName = 'User', conversations = [], onSendMessage }: RightPanelProps) => {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // ── Real Dynamic Metrics Calculation ──────────────────────────────────────
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const messagesTodayCount = conversations.reduce((acc, conv) => {
    return acc + conv.messages.filter(m => new Date(m.timestamp) >= todayStart).length;
  }, 0);

  const totalMessages = conversations.reduce((acc, conv) => acc + conv.messages.length, 0);
  const totalConvs = conversations.length;
  const activeAutomations = conversations.filter(c => c.messages.some(m => m.content.toLowerCase().includes('remind') || m.content.toLowerCase().includes('schedule'))).length;

  return (
    <div
      className="flex flex-col h-screen overflow-y-auto"
      style={{
        width: 280,
        background: '#0B1220',
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}
    >
      <div className="p-4 space-y-4">

        {/* ── Daily Overview ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(0,191,255,0.12) 0%, rgba(59,130,246,0.08) 100%)',
            border: '1px solid rgba(0,191,255,0.15)',
          }}
        >
          <div className="px-4 pt-4 pb-3">
            <div className="text-xs font-semibold mb-1" style={{ color: '#94A3B8' }}>{dayName}</div>
            <div className="text-lg font-bold text-white">{dateStr}</div>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1">
                <div className="text-[10px] mb-1" style={{ color: '#475569' }}>Productivity Activity</div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(15, totalMessages * 5))}%`,
                      background: 'linear-gradient(90deg, #00BFFF, #3B82F6)',
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold" style={{ color: '#00BFFF' }}>
                {Math.min(100, Math.max(15, totalMessages * 5))}%
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Real Usage Statistics ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#334155' }}>
            Real-time Usage
          </div>
          <div className="space-y-2">
            <StatCard icon={BarChart2}  label="Messages today"  value={messagesTodayCount.toString()} color="#3B82F6" />
            <StatCard icon={Zap}        label="Active Tasks"    value={activeAutomations.toString()}   color="#F59E0B" sub="monitored" />
            <StatCard icon={TrendingUp} label="Total Chats"     value={totalConvs.toString()}          color="#22C55E" />
            <StatCard icon={Cpu}        label="Total Messages"  value={totalMessages.toString()}       color="#00BFFF" />
          </div>
        </motion.div>

        {/* ── Functional Smart Tools ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        >
          <div className="text-xs font-semibold uppercase tracking-widest mb-2.5" style={{ color: '#334155' }}>
            Smart Tools
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {TOOLS.map((tool, i) => (
              <motion.button
                key={tool.label}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.06)' }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + i * 0.02 }}
                onClick={() => onSendMessage && onSendMessage(tool.cmd)}
                className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all text-center"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                title={tool.label}
              >
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: `${tool.color}18` }}
                >
                  <tool.icon className="w-3.5 h-3.5" style={{ color: tool.color }} />
                </div>
                <span className="text-[9px] leading-tight truncate w-full" style={{ color: '#94A3B8' }}>
                  {tool.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Dynamic Notifications ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="rounded-xl p-3"
          style={{
            background: 'rgba(0,191,255,0.06)',
            border: '1px solid rgba(0,191,255,0.15)',
          }}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5" style={{ color: '#00BFFF' }} />
            <span className="text-xs font-semibold" style={{ color: '#00BFFF' }}>System Status</span>
          </div>
          <p className="text-[10px] mt-1" style={{ color: '#94A3B8' }}>
            {totalConvs > 0 ? `${totalConvs} active chat(s) saved & synced to cloud.` : 'Ready for your first command.'}
          </p>
        </motion.div>

      </div>
    </div>
  );
};
