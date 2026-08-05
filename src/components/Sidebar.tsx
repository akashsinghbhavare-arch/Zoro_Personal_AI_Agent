import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquarePlus, Image, FolderOpen, Zap, Settings, Trash2,
  Search, ChevronRight, Bot, Calendar, BookOpen, Code2,
  Crown, HardDrive, FileText,
} from 'lucide-react';
import { User, Conversation } from '../types';
import { useState, useMemo } from 'react';

interface SidebarProps {
  user: User;
  conversations: Conversation[];
  currentConversationId: string | null;
  currentView?: 'chat' | 'pdf-reader' | 'code-assistant';
  onNewChat: () => void;
  onPDFReader?: () => void;
  onCodeAssistant?: () => void;
  onImageCreation: () => void;
  onProjects: () => void;
  onImages: () => void;
  onCalendar?: () => void;
  onEditProfile: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose?: () => void;
}

const NAV_ITEMS = [
  { icon: MessageSquarePlus, label: 'New Chat',       shortcut: '⌘N', accent: true },
  { icon: FileText,          label: 'PDF Reader',     shortcut: '⌘F', accent: false },
  { icon: Image,             label: 'Image Creation', shortcut: '⌘I', accent: false },
  { icon: FolderOpen,        label: 'Projects',       shortcut: '⌘P', accent: false },
  { icon: Code2,             label: 'Code Assistant', shortcut: '⌘K', accent: false },
  { icon: BookOpen,          label: 'Knowledge Base', shortcut: '⌘B', accent: false },
  { icon: Zap,               label: 'Automation',     shortcut: '⌘A', accent: false },
  { icon: Calendar,          label: 'Calendar',       shortcut: '⌘C', accent: false },
  { icon: Settings,          label: 'Settings',       shortcut: '⌘,', accent: false },
];

const formatDate = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)   return 'just now';
  if (hrs < 1)    return `${mins}m ago`;
  if (days < 1)   return `${hrs}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days}d ago`;
  return date.toLocaleDateString();
};

export const Sidebar = ({
  user, conversations, currentConversationId, currentView = 'chat',
  onNewChat, onPDFReader, onImageCreation, onProjects, onImages, onCalendar,
  onCodeAssistant,
  onEditProfile, onSelectConversation, onDeleteConversation,
  isOpen, onClose,
}: SidebarProps) => {
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);
  const [hoveredNav, setHoveredNav]   = useState<string | null>(null);
  const [searchQ, setSearchQ]         = useState('');

  const handlers = [
    onNewChat,
    onPDFReader ?? (() => {}),
    onImageCreation,
    onProjects,
    onCodeAssistant ?? (() => {}),
    onImages,
    () => {},
    onCalendar ?? (() => {}),
    onEditProfile
  ];

  const filtered = useMemo(() =>
    conversations.filter(c => c.title.toLowerCase().includes(searchQ.toLowerCase())),
  [conversations, searchQ]);

  const initial = user.username.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && onClose && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -320 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed lg:static top-0 left-0 h-screen z-50 flex flex-col"
        style={{
          width: 280,
          background: '#0B1220',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* ── Logo ─────────────────────────────────────────────── */}
        <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="flex items-center gap-3">
            {/* Animated orb logo */}
            <div className="relative w-9 h-9 flex-shrink-0">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #00BFFF 0%, #3B82F6 100%)',
                  boxShadow: '0 0 20px rgba(0,191,255,0.35)',
                }}
              >
                <Bot className="w-5 h-5 text-white" />
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: '#22C55E', borderColor: '#0B1220' }}
              />
            </div>
            <div>
              <div className="text-white font-semibold text-[15px] leading-tight tracking-tight">Nova AI</div>
              <div style={{ color: '#94A3B8', fontSize: 11 }}>Your Personal Assistant</div>
            </div>
          </div>
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav className="px-3 pt-4 pb-2 space-y-0.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {NAV_ITEMS.map((item, i) => {
            const active =
              (item.label === 'PDF Reader' && currentView === 'pdf-reader') ||
              (item.label === 'New Chat' && currentView === 'chat' && !currentConversationId);
            return (
              <motion.button
                key={item.label}
                whileTap={{ scale: 0.97 }}
                onHoverStart={() => setHoveredNav(item.label)}
                onHoverEnd={() => setHoveredNav(null)}
                onClick={handlers[i]}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative"
                style={{
                  background: active
                    ? 'rgba(0,191,255,0.1)'
                    : hoveredNav === item.label
                    ? 'rgba(255,255,255,0.04)'
                    : 'transparent',
                  color: active ? '#00BFFF' : '#94A3B8',
                }}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full" style={{ background: '#00BFFF' }} />
                )}
                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? '#00BFFF' : 'inherit' }} />
                <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                <AnimatePresence>
                  {hoveredNav === item.label && (
                    <motion.span
                      initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="text-xs font-mono"
                      style={{ color: '#475569', fontSize: 10 }}
                    >
                      {item.shortcut}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </nav>

        {/* ── Recent Chats ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden px-3 pt-4">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#475569' }}>
              Recent
            </span>
            <ChevronRight className="w-3 h-3" style={{ color: '#475569' }} />
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#475569' }} />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: '#94A3B8',
              }}
            />
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto space-y-0.5 -mx-1">
            {filtered.length === 0 ? (
              <div className="py-10 text-center">
                <MessageSquarePlus className="w-6 h-6 mx-auto mb-2 opacity-20" style={{ color: '#94A3B8' }} />
                <p className="text-xs" style={{ color: '#475569' }}>
                  {searchQ ? 'No results' : 'No conversations yet'}
                </p>
              </div>
            ) : (
              filtered.map((conv, idx) => {
                const isActive = currentConversationId === conv.id;
                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="relative group mx-1"
                    onMouseEnter={() => setHoveredConv(conv.id)}
                    onMouseLeave={() => setHoveredConv(null)}
                  >
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                      style={{
                        background: isActive
                          ? 'rgba(0,191,255,0.08)'
                          : hoveredConv === conv.id
                          ? 'rgba(255,255,255,0.04)'
                          : 'transparent',
                        border: isActive ? '1px solid rgba(0,191,255,0.2)' : '1px solid transparent',
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquarePlus
                          className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                          style={{ color: isActive ? '#00BFFF' : '#475569' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-medium truncate leading-tight"
                            style={{ color: isActive ? '#E2E8F0' : '#94A3B8' }}
                          >
                            {conv.title}
                          </div>
                          <div className="text-[10px] mt-0.5" style={{ color: '#475569' }}>
                            {formatDate(conv.updatedAt)}
                          </div>
                        </div>
                      </div>
                    </button>

                    <AnimatePresence>
                      {hoveredConv === conv.id && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                          onClick={e => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* ── User Card ────────────────────────────────────────── */}
        <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <motion.div
            whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
            onClick={onEditProfile}
          >
            {/* Avatar */}
            <div
              className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #3B82F6 100%)' }}
            >
              {initial}
              <span
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                style={{ background: '#22C55E', borderColor: '#0B1220' }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white truncate">
                {user.nickname || user.fullName || user.username}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Crown className="w-2.5 h-2.5" style={{ color: '#F59E0B' }} />
                <span style={{ color: '#475569', fontSize: 10 }}>Pro Plan</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Settings className="w-3.5 h-3.5" style={{ color: '#475569' }} />
            </div>
          </motion.div>

          {/* Storage bar */}
          <div className="mt-2 px-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <HardDrive className="w-2.5 h-2.5" style={{ color: '#475569' }} />
                <span style={{ color: '#475569', fontSize: 10 }}>Storage</span>
              </div>
              <span style={{ color: '#475569', fontSize: 10 }}>2.4 GB / 10 GB</span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: '24%', background: 'linear-gradient(90deg, #00BFFF, #3B82F6)' }}
              />
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  );
};
