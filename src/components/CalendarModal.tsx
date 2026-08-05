import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, Trash2 } from 'lucide-react';
import {
  saveCalendarEventsToFirebase,
  getCalendarEventsFromFirebase,
  deleteCalendarEventFromFirebase,
} from '../utils/firebaseStorage';

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  category: 'work' | 'personal' | 'meeting' | 'task';
}

interface CalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  work: '#3B82F6',
  personal: '#22C55E',
  meeting: '#F59E0B',
  task: '#00BFFF',
};

const STORAGE_KEY = 'nova_calendar_events';

export const CalendarModal: React.FC<CalendarModalProps> = ({ isOpen, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [
        { id: '1', title: 'Team Sync & Product Strategy', date: new Date().toISOString().split('T')[0], time: '10:00', category: 'meeting' },
        { id: '2', title: 'Review Nova AI API Integration', date: new Date().toISOString().split('T')[0], time: '14:30', category: 'work' },
      ];
    } catch {
      return [];
    }
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventTime, setNewEventTime] = useState('09:00');
  const [newEventCategory, setNewEventCategory] = useState<'work' | 'personal' | 'meeting' | 'task'>('work');

  // Sync to Cloud (Firebase) on mount and on event changes
  useEffect(() => {
    getCalendarEventsFromFirebase().then(cloudEvents => {
      if (cloudEvents && cloudEvents.length > 0) {
        setEvents(cloudEvents as CalendarEvent[]);
      }
    });
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    if (events.length > 0) {
      saveCalendarEventsToFirebase(events);
    }
  }, [events]);

  if (!isOpen) return null;

  // Calendar month math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const newEv: CalendarEvent = {
      id: Date.now().toString(),
      title: newEventTitle.trim(),
      date: selectedDate,
      time: newEventTime,
      category: newEventCategory,
    };

    setEvents(prev => [...prev, newEv]);
    setNewEventTitle('');
    setShowAddModal(false);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
    deleteCalendarEventFromFirebase(id);
  };

  const selectedDateEvents = events.filter(e => e.date === selectedDate);
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0"
          style={{ background: 'rgba(5,9,18,0.85)', backdropFilter: 'blur(16px)' }}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="relative w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
          style={{
            background: '#0B1220',
            border: '1px solid rgba(255,255,255,0.08)',
            maxHeight: '90vh',
          }}
        >
          {/* Main Calendar Grid */}
          <div className="flex-1 p-6 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: 'rgba(0,191,255,0.12)', border: '1px solid rgba(0,191,255,0.2)' }}
                >
                  <CalendarIcon className="w-5 h-5" style={{ color: '#00BFFF' }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {monthNames[month]} {year}
                  </h2>
                  <p className="text-xs font-medium" style={{ color: '#94A3B8' }}>
                    Schedule & Events
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl transition-colors hover:bg-white/5"
                  style={{ color: '#94A3B8' }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#00BFFF', border: '1px solid rgba(0,191,255,0.2)' }}
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl transition-colors hover:bg-white/5"
                  style={{ color: '#94A3B8' }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-xs font-semibold uppercase tracking-wider py-2" style={{ color: '#475569' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-7 gap-1.5 flex-1">
              {/* Empty leading cells */}
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="h-14 rounded-2xl opacity-20" />
              ))}

              {/* Month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const isToday = formattedDate === todayStr;
                const isSelected = formattedDate === selectedDate;
                const dayEvents = events.filter(e => e.date === formattedDate);

                return (
                  <motion.button
                    key={dayNum}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setSelectedDate(formattedDate)}
                    className="h-14 rounded-2xl p-2 flex flex-col justify-between text-left relative transition-all"
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(0,191,255,0.2), rgba(59,130,246,0.15))'
                        : isToday
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(255,255,255,0.02)',
                      border: isSelected
                        ? '1px solid rgba(0,191,255,0.4)'
                        : isToday
                        ? '1px solid rgba(255,255,255,0.15)'
                        : '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <span
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : isToday ? 'text-[#00BFFF]' : 'text-slate-300'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {/* Event indicators */}
                    {dayEvents.length > 0 && (
                      <div className="flex items-center gap-1 overflow-hidden">
                        {dayEvents.slice(0, 3).map(ev => (
                          <div
                            key={ev.id}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ background: CATEGORY_COLORS[ev.category] || '#00BFFF' }}
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-slate-400">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Side Panel — Selected Date Events */}
          <div
            className="w-full md:w-80 p-6 flex flex-col justify-between"
            style={{
              background: '#101826',
              borderLeft: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Events for {selectedDate}</h3>
                  <p className="text-xs text-slate-400">{selectedDateEvents.length} event(s)</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl transition-colors hover:bg-white/10"
                  style={{ color: '#94A3B8' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Event List */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-10">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs text-slate-500">No events scheduled for this day.</p>
                  </div>
                ) : (
                  selectedDateEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-2xl flex items-start justify-between gap-2"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderLeft: `4px solid ${CATEGORY_COLORS[ev.category] || '#00BFFF'}`,
                      }}
                    >
                      <div>
                        <div className="text-xs font-semibold text-white leading-tight">{ev.title}</div>
                        <div className="flex items-center gap-1.5 mt-1 text-[11px]" style={{ color: '#94A3B8' }}>
                          <Clock className="w-3 h-3" />
                          <span>{ev.time}</span>
                          <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-white/5">
                            {ev.category}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteEvent(ev.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Event Button */}
            <div className="mt-4 pt-4 border-t border-white/5">
              {showAddModal ? (
                <form onSubmit={handleAddEvent} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Event Title..."
                    value={newEventTitle}
                    onChange={e => setNewEventTitle(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="time"
                      value={newEventTime}
                      onChange={e => setNewEventTime(e.target.value)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none flex-1"
                    />
                    <select
                      value={newEventCategory}
                      onChange={e => setNewEventCategory(e.target.value as any)}
                      className="bg-slate-900 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none flex-1"
                    >
                      <option value="work">Work</option>
                      <option value="meeting">Meeting</option>
                      <option value="personal">Personal</option>
                      <option value="task">Task</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500"
                    >
                      Save Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-3 py-2 rounded-xl text-xs text-slate-400 bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full py-2.5 rounded-2xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(0,191,255,0.2), rgba(59,130,246,0.2))',
                    border: '1px solid rgba(0,191,255,0.3)',
                  }}
                >
                  <Plus className="w-4 h-4" /> Add Event for {selectedDate}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
