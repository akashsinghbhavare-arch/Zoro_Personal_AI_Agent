import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, ExternalLink, Key, Cpu } from 'lucide-react';
import { User } from '../types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (user: User) => void;
}

const MODEL_OPTIONS = [
  { label: '🆓 Gemma 4 26B (Free - Recommended)', value: 'google/gemma-4-26b-a4b-it:free' },
  { label: '🆓 GPT OSS 20B (Free)', value: 'openai/gpt-oss-20b:free' },
  { label: '🆓 Nemotron Nano 9B (Free)', value: 'nvidia/nemotron-nano-9b-v2:free' },
  { label: '🆓 Ling 3.0 Flash (Free)', value: 'inclusionai/ling-3.0-flash:free' },
  { label: '💳 GPT-4o (Requires API Key)', value: 'openai/gpt-4o' },
  { label: '💳 GPT-4o Mini (Requires API Key)', value: 'openai/gpt-4o-mini' },
  { label: '💳 Claude 3.5 Sonnet (Requires API Key)', value: 'anthropic/claude-3.5-sonnet' },
];

export const ProfileModal = ({ isOpen, onClose, user, onSave }: ProfileModalProps) => {
  const [formData, setFormData] = useState<User>(user);
  const [errors, setErrors] = useState<Partial<Record<keyof User, string>>>({});
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    setFormData(user);
  }, [user]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const handleChange = (field: keyof User, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Partial<Record<keyof User, string>> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
    onClose();
  };

  const inputClass = "w-full px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700/50 overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between sticky top-0 bg-slate-900/90 backdrop-blur-sm">
              <h2 className="text-xl font-semibold text-white">Edit Profile</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Profile Fields */}
              <div>
                <label className={labelClass}>Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value)}
                  className={inputClass}
                  placeholder="Enter username"
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-red-400">{errors.username}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={inputClass}
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={inputClass}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-400">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className={labelClass}>Nickname</label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => handleChange('nickname', e.target.value)}
                  className={inputClass}
                  placeholder="Enter nickname"
                />
              </div>

              <div>
                <label className={labelClass}>Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className={inputClass}
                  placeholder="Enter full name"
                />
                {errors.fullName && (
                  <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-slate-700/50 pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-violet-400" />
                  <span className="text-sm font-semibold text-violet-300 uppercase tracking-wider">AI Settings</span>
                </div>

                {/* Groq API Key */}
                <div className="mb-4">
                  <label className={labelClass}>
                    Groq API Key (⚡ Primary / Highest Priority)
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={formData.groqApiKey ?? ''}
                      onChange={(e) => handleChange('groqApiKey', e.target.value)}
                      className={`${inputClass} pr-12`}
                      placeholder="gsk_..."
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                    <span>Fastest responses. Get a free key at</span>
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 flex items-center gap-0.5 transition-colors"
                    >
                      console.groq.com/keys <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* OpenRouter API Key */}
                <div className="mb-4">
                  <label className={labelClass}>
                    OpenRouter API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={formData.apiKey ?? ''}
                      onChange={(e) => handleChange('apiKey', e.target.value)}
                      className={`${inputClass} pr-12`}
                      placeholder="sk-or-v1-..."
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                    <span>Don't have a key? Get one free at</span>
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 flex items-center gap-0.5 transition-colors"
                    >
                      openrouter.ai/keys <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Model Selector */}
                <div>
                  <label className={labelClass}>
                    <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" />AI Model</span>
                  </label>
                  <select
                    value={formData.selectedModel ?? 'google/gemma-4-26b-a4b-it:free'}
                    onChange={(e) => handleChange('selectedModel', e.target.value)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {MODEL_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-slate-800">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    🆓 Free models work without credits. 💳 Paid models require a funded API key.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-lg transition-all font-medium shadow-lg shadow-violet-500/25"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
