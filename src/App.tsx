import { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceState } from './components/MicrophoneVisualizer';
import { useTextToSpeech } from './hooks/useTextToSpeech';
import { Sidebar } from './components/Sidebar';
import { MainWorkspace } from './components/MainWorkspace';
import { PDFReader } from './components/PDFReader/PDFReader';
import { CodeAssistant } from './components/CodeAssistant/CodeAssistant';
import { ProfileModal } from './components/ProfileModal';
import { ImageGenerationModal } from './components/ImageGenerationModal';
import { CalendarModal } from './components/CalendarModal';
import { Toast } from './components/Toast';
import { RightPanel } from './components/RightPanel';
import { useSpeechRecognition } from './hooks/useSpeechRecognition';
import { User, Conversation, Message } from './types';
import { generateImage } from './utils/imageGen';
import { getWeatherForecast } from './utils/weatherService';
import {
  initializeDefaultUser,
  getUser,
  saveUser,
  getConversations,
  saveConversations,
  getCurrentConversation,
  saveCurrentConversation,
} from './utils/storage';
import {
  saveUserToFirebase,
  getUserFromFirebase,
  saveConversationsToFirebase,
  getConversationsFromFirebase,
  setPresenceOnline,
} from './utils/firebaseStorage';
import { initAnalytics } from './lib/firebase';

const AGENT_NAME = 'Nova AI';
const GROQ_KEYS_POOL = [import.meta.env.VITE_GROQ_DEFAULT_API_KEY].filter(Boolean);
const DEFAULT_NVIDIA_KEY = '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';
const DEFAULT_API_KEY = import.meta.env.VITE_GROQ_DEFAULT_API_KEY || '';
const DEFAULT_GEMINI_KEY = 'AIzaSy' + 'B9a01x5yZ_placeholder';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // Best free Groq model
const FREE_FALLBACK_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'openai/gpt-oss-20b:free',
  'nvidia/nemotron-nano-9b-v2:free',
  'inclusionai/ling-3.0-flash:free',
];

function App() {
  const [user, setUser] = useState<User>(initializeDefaultUser());
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'chat' | 'pdf-reader' | 'code-assistant'>('chat');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ─── Refs to always have fresh state values inside async callbacks ───────
  const conversationsRef = useRef(conversations);
  const currentConversationIdRef = useRef(currentConversationId);
  const userRef = useRef(user);

  // Keep refs in sync with state every render
  conversationsRef.current = conversations;
  currentConversationIdRef.current = currentConversationId;
  userRef.current = user;

  // Load data on mount: localStorage first (instant), then Firebase (cloud sync)
  useEffect(() => {
    const load = async () => {
      // ── Local first (zero-latency) ──────────────────────────
      const localUser = getUser();
      if (localUser) setUser(localUser);

      const localConvs = getConversations();
      setConversations(localConvs);

      const currentId = getCurrentConversation();
      if (currentId && localConvs.find(c => c.id === currentId)) {
        setCurrentConversationId(currentId);
      }

      // ── Firebase (cloud sync) ───────────────────────────────
      try {
        await setPresenceOnline();
        await initAnalytics();

        const fbUser = await getUserFromFirebase();
        if (fbUser) {
          setUser(fbUser);
          saveUser(fbUser); // mirror to localStorage
        }

        const fbConvs = await getConversationsFromFirebase();
        if (fbConvs.length > 0) {
          setConversations(fbConvs);
          saveConversations(fbConvs); // mirror to localStorage
        }
      } catch (err) {
        console.warn('[Firebase] Initial cloud sync failed — using localStorage data.', err);
      }
    };
    load();
  }, []);

  // Save conversations: localStorage (sync) + Firebase (async cloud)
  useEffect(() => {
    saveConversations(conversations);
    if (conversations.length > 0) {
      saveConversationsToFirebase(conversations); // non-blocking cloud backup
    }
  }, [conversations]);

  // Save user profile: localStorage (sync) + Firebase (async cloud)
  // This runs every time profile is updated, ensuring web + Electron share the same data
  useEffect(() => {
    saveUser(user);
    saveUserToFirebase(user); // non-blocking cloud sync
  }, [user]);

  // Save current conversation ID
  useEffect(() => {
    saveCurrentConversation(currentConversationId);
  }, [currentConversationId]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
  }, []);

  // ─── Helpers (defined BEFORE they are used) ────────────────────────────

  const generateConversationTitle = (firstMessage: string): string => {
    const words = firstMessage.split(' ').slice(0, 5).join(' ');
    return words.length > 40 ? words.substring(0, 40) + '...' : words;
  };

  const createNewConversation = (firstMessage: Message): Conversation => {
    const now = new Date();
    return {
      id: `conv-${Date.now()}`,
      title: generateConversationTitle(firstMessage.content),
      messages: [firstMessage],
      createdAt: now,
      updatedAt: now,
    };
  };

  // ─── Main send handler — uses refs for fresh state ────────────────────
  const handleSendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;

    const now = new Date();
    const userMessage: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: trimmed,
      timestamp: now,
    };

    // Read fresh state via refs (avoids stale closure over state)
    const currentConvId = currentConversationIdRef.current;
    const currentConvs = conversationsRef.current;

    // Build conversation snapshot with the new user message
    let conversation: Conversation;
    if (currentConvId) {
      const existing = currentConvs.find(c => c.id === currentConvId);
      if (existing) {
        conversation = {
          ...existing,
          messages: [...existing.messages, userMessage],
          updatedAt: now,
        };
      } else {
        conversation = createNewConversation(userMessage);
      }
    } else {
      conversation = createNewConversation(userMessage);
    }

    // Show user message immediately using functional updater (safe from stale state)
    setConversations(prev => {
      const exists = prev.find(c => c.id === conversation.id);
      return exists
        ? prev.map(c => c.id === conversation.id ? conversation : c)
        : [conversation, ...prev];
    });
    // ─── Image Generation Intent Check ──────────────────────────────────────
    // Broad natural-language detection: catches questions, polite requests, variations
    const imageIntentRegex = /(?:generate|create|draw|make|show|render|produce|give me|can you|please).{0,30}(?:image|photo|picture|artwork|illustration|painting|sketch|portrait|wallpaper|art)(?:\s+of)?\s*(.+)|(?:image|photo|picture)\s+of\s+(.+)|^(?:\/image|\/img)\s+(.+)/i;
    const imageMatch = trimmed.match(imageIntentRegex);
    const imgPrompt = imageMatch ? (imageMatch[1] || imageMatch[2] || imageMatch[3] || '').trim() : '';

    if (imageMatch && imgPrompt.length > 2) {
      setCurrentConversationId(conversation.id);
      setIsTyping(true);
      try {
        const imageUrl = await generateImage(imgPrompt);
        const aiMessage: Message = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: `Here is the image you requested for **"${imgPrompt}"**:\n\n![${imgPrompt}](${imageUrl})`,
          timestamp: new Date(),
        };

        setConversations(prev =>
          prev.map(c => {
            if (c.id !== conversation.id) return c;
            const hasUserMsg = c.messages.some(m => m.id === userMessage.id);
            const msgs = hasUserMsg ? [...c.messages, aiMessage] : [...c.messages, userMessage, aiMessage];
            return {
              ...c,
              updatedAt: new Date(),
              messages: msgs,
            };
          })
        );
        showToast('🎨 Image generated successfully!', 'success');
      } catch (err: any) {
        showToast(`Image generation failed: ${err?.message || 'Error'}`, 'error');
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // ─── Weather Forecast Intent Check ──────────────────────────────────────
    const weatherIntentRegex = /(?:weather|forecast|temperature|climate|rain|snow|humidity|wind|is it raining|how hot|how cold|weather report)/i;
    if (weatherIntentRegex.test(trimmed)) {
      setCurrentConversationId(conversation.id);
      setIsTyping(true);
      try {
        const weatherRes = await getWeatherForecast(trimmed);
        const aiMessage: Message = {
          id: `msg-${Date.now()}-ai`,
          role: 'assistant',
          content: weatherRes.report,
          timestamp: new Date(),
        };

        setConversations(prev =>
          prev.map(c => {
            if (c.id !== conversation.id) return c;
            const hasUserMsg = c.messages.some(m => m.id === userMessage.id);
            const msgs = hasUserMsg ? [...c.messages, aiMessage] : [...c.messages, userMessage, aiMessage];
            return {
              ...c,
              updatedAt: new Date(),
              messages: msgs,
            };
          })
        );
        showToast('🌤️ Weather forecast loaded!', 'success');
      } catch (err: any) {
        showToast(`Weather request failed: ${err?.message || 'Error'}`, 'error');
      } finally {
        setIsTyping(false);
      }
      return;
    }

    // API settings from fresh ref
    const customGroqKey = userRef.current.groqApiKey?.trim();
    // Build full pool: custom key first (if any), followed by pool keys
    const groqKeysToTry = customGroqKey ? [customGroqKey, ...GROQ_KEYS_POOL] : GROQ_KEYS_POOL;
    const openRouterKey = userRef.current.apiKey?.trim() || DEFAULT_API_KEY;
    const geminiKey = userRef.current.geminiApiKey?.trim() || DEFAULT_GEMINI_KEY;
    const model = userRef.current.selectedModel?.trim() || FREE_FALLBACK_MODELS[0];

    const systemPrompt = `You are ${AGENT_NAME}, a helpful and friendly personal AI assistant. Be concise and clear.

IMPORTANT CAPABILITIES:
1. You CAN generate images using NVIDIA NIM AI. When a user asks for an image, picture, photo, drawing, or artwork, confirm you are generating it and the image will appear in the chat. Never say you cannot generate images.
2. You HAVE real-time weather capabilities powered by Open-Meteo & NVIDIA Weather Intelligence. Never say you don't have access to real-time weather conditions. Always provide weather reports starting with "The weather in [Location] is...".

Language rule: If the user writes in Hindi (Devanagari script), reply in Hindi. If English, reply in English. Always match the user's language.`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // ── NVIDIA NIM API call (High priority) ─────────────────────────
    const makeNvidiaNIMRequest = () =>
      fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DEFAULT_NVIDIA_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-70b-instruct',
          messages: apiMessages,
          stream: true,
          temperature: 0.7,
        }),
      });

    // ── Groq API call (primary, highest priority) ───────────────────
    const makeGroqRequest = (useKey: string) =>
      fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: GROQ_MODEL, messages: apiMessages, stream: true }),
      });

    // ── Gemini API call ──────────────────────────────────────────────
    const makeGeminiRequest = async () => {
      const geminiMessages = conversation.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const body = {
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: geminiMessages,
      };

      const geminiModel = 'gemini-2.0-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?alt=sse&key=${geminiKey}`;

      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    };

    // ── OpenRouter API call ──────────────────────────────────────────
    const makeOpenRouterRequest = (useModel: string, useKey: string) =>
      fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${useKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://nova-ai.app',
          'X-Title': AGENT_NAME,
        },
        body: JSON.stringify({ model: useModel, messages: apiMessages, stream: true }),
      });

    try {
      let response: Response | null = null;
      let isGemini = false;

      // ── Priority 1: NVIDIA NIM API (Direct NVIDIA Engine) ────────────
      try {
        const nvRes = await makeNvidiaNIMRequest();
        if (nvRes.ok) {
          response = nvRes;
        }
      } catch (err) {
        console.warn('[NVIDIA NIM API] Error, attempting fallback providers:', err);
      }

      // ── Priority 2: Groq Rotation Pool ──────────────────────────────
      if (!response) {
        for (const k of groqKeysToTry) {
          try {
            const groqRes = await makeGroqRequest(k);
            if (groqRes.ok) {
              response = groqRes;
              break;
            }
          } catch {
            // next key
          }
        }
      }

      if (!response) {
        // ── Priority 3: Gemini ────────────────────────────────────────
        try {
          response = await makeGeminiRequest();
          if (response.ok) {
            isGemini = true;
          } else {
            throw new Error('Gemini failed');
          }
        } catch {
          // ── Priority 3: OpenRouter ────────────────────────────────
          response = await makeOpenRouterRequest(model, openRouterKey);
        }
      }

      // Robust multi-model fallback loop if response failed (402 limit, 429 rate limit, 404 missing)
      if (!response) {
        throw new Error('All API providers failed. Please check your internet connection.');
      }
      if (!response.ok) {
        for (const fallbackModel of FREE_FALLBACK_MODELS) {
          if (fallbackModel === model) continue; // Skip if already tried
          try {
            const fallbackRes = await makeOpenRouterRequest(fallbackModel, openRouterKey);
            if (fallbackRes.ok) {
              response = fallbackRes;
              // Persist the working fallback model to user state and storage so notification shows only ONCE
              const updatedUser = { ...userRef.current, selectedModel: fallbackModel };
              setUser(updatedUser);
              saveUser(updatedUser);
              showToast(`⚡ Model limit reached. Switched to ${fallbackModel.split('/')[1]}.`, 'info');
              break;
            }
          } catch {
            // Try next fallback
          }
        }
      }

      if (!response || !response.ok) {
        const errData = await response?.json().catch(() => ({}));
        const errMsg = (errData as any)?.error?.message || `API error: ${response?.status}`;
        if (response?.status === 429) {
          showToast('⏳ Rate limit reached. Please wait a moment and try again.', 'error');
        } else if (response?.status === 402) {
          showToast('💳 Insufficient credits. Add a funded API key in Profile Settings.', 'error');
        } else if (response?.status === 401) {
          showToast('🔑 Invalid API key. Update your API key in Profile Settings.', 'error');
        } else {
          showToast(`API error: ${errMsg}`, 'error');
        }
        return;
      }

      // ── Streaming: insert placeholder message, then fill it token-by-token ──
      const aiMsgId = `msg-${Date.now()}-ai`;
      const aiMsgBase: Message = {
        id: aiMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      };

      setConversations(prev =>
        prev.map(c =>
          c.id === conversation.id
            ? { ...c, messages: [...c.messages, aiMsgBase], updatedAt: new Date() }
            : c
        )
      );
      setIsTyping(false);

      const reader = response!.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

        for (const line of lines) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);

            // Extract token — Gemini vs OpenRouter have different shapes
            let token = '';
            if (isGemini) {
              token = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
            } else {
              token = parsed?.choices?.[0]?.delta?.content ?? '';
            }

            if (!token) continue;
            accumulated += token;

            // ── Early TTS: speak the first sentence as soon as it arrives ──────
            // Fire TTS after we have a complete sentence (. ! ?) and at least 60 chars
            if (!ttsStartedRef.current && accumulated.length > 60) {
              const sentenceEnd = accumulated.search(/[.!?]/);
              if (sentenceEnd !== -1) {
                ttsStartedRef.current = true;
                speakRef.current(accumulated.substring(0, sentenceEnd + 1).trim());
              }
            }

            setConversations(prev =>
              prev.map(c => {
                if (c.id !== conversation.id) return c;
                return {
                  ...c,
                  updatedAt: new Date(),
                  messages: c.messages.map(m =>
                    m.id === aiMsgId ? { ...m, content: accumulated } : m
                  ),
                };
              })
            );
          } catch {
            // malformed chunk — skip
          }
        }
      }

      // ── Auto-play AI response as speech ────────────────
      // Speak only if we haven't already started speaking mid-stream
      if (accumulated.trim() && !ttsStartedRef.current) {
        speakRef.current(accumulated);
      }
    } catch (err) {
      console.error('API request failed:', err);
      showToast('🌐 Network error — check your internet connection.', 'error');
    } finally {
      setIsTyping(false);
    }
  }, [showToast]); // stable: showToast is memoized with []

  // ─── Voice state machine ──────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');

  // TTS — when AI finishes speaking, return voiceState to idle without auto-restarting mic
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech({
    onStart: () => setVoiceState('speaking'),
    onEnd:   () => {
      setVoiceState('idle');
      // Mic stays OFF after AI response finishes (user must click mic to turn on)
    },
  });

  // Track whether TTS already started mid-stream for this response
  const ttsStartedRef = useRef(false);

  // Keep speak/stopSpeaking in refs so useSpeechRecognition callbacks can call them
  const speakRef       = useRef(speak);
  const stopSpeakRef   = useRef(stopSpeaking);
  speakRef.current     = speak;
  stopSpeakRef.current = stopSpeaking;

  // ─── Speech recognition ───────────────────────────────────────────────
  const handleTranscript = useCallback((text: string) => {
    setVoiceState('processing');
    handleSendMessage(text);
  }, [handleSendMessage]);

  const { startListening, stopListening, isSupported, error } =
    useSpeechRecognition(handleTranscript);

  // Auto-start microphone on initial app launch
  useEffect(() => {
    if (isSupported) {
      // Start listening by default on app launch
      const timer = setTimeout(() => {
        setVoiceState('listening');
        startListening();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isSupported, startListening]);

  // Stable ref so TTS onEnd can call it without stale closure
  const startListeningFn = useCallback(() => {
    if (isSupported) {
      setVoiceState('listening');
      startListening();
    }
  }, [isSupported, startListening]);

  const handleMicrophoneClick = useCallback(() => {
    if (!isSupported) {
      showToast('Speech recognition is not supported. Please use Chrome or Edge.', 'error');
      return;
    }
    if (voiceState === 'speaking') {
      // Barge-in: stop AI speech and immediately start listening
      stopSpeakRef.current();
      setVoiceState('listening');
      startListening();
    } else if (voiceState === 'listening') {
      stopListening();
      setVoiceState('idle');
    } else if (voiceState === 'idle') {
      startListeningFn();
    }
  }, [isSupported, voiceState, showToast, stopListening, startListeningFn, startListening]);

  const handleStopSpeaking = useCallback(() => {
    stopSpeakRef.current();
    setVoiceState('idle');
  }, []);

  // Keep voiceState in sync with TTS isSpeaking
  useEffect(() => {
    if (!isSpeaking && voiceState === 'speaking') setVoiceState('idle');
  }, [isSpeaking, voiceState]);

  useEffect(() => {
    if (error) {
      const errorMessages: Record<string, string> = {
        'not-allowed': '🎙️ Microphone access denied. Allow microphone in browser settings.',
        'no-speech':   '🔇 No speech detected. Please try again.',
        'audio-capture': '🎙️ No microphone found. Connect a microphone and retry.',
        'network':     '🌐 Network error during speech recognition.',
        'aborted':     '',
      };
      const msg = errorMessages[error] ?? `Speech recognition error: ${error}`;
      if (msg) showToast(msg, 'error');
      setVoiceState('idle');
    }
  }, [error, showToast]);

  // ─── Other handlers ───────────────────────────────────────────────────

  const handleNewChat = useCallback(() => {
    setCurrentView('chat');
    setCurrentConversationId(null);
    showToast('Started new conversation', 'success');
  }, [showToast]);

  // ─── Electron Global Shortcuts & System Tray Event Handlers ──────────────────
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    window.electronAPI.onTrayAction((action) => {
      if (action === 'new-chat') handleNewChat();
      else if (action === 'voice-mode') handleMicrophoneClick();
      else if (action === 'settings') setIsProfileModalOpen(true);
    });

    window.electronAPI.onGlobalShortcut((shortcut) => {
      if (shortcut === 'voice-mode') handleMicrophoneClick();
      else if (shortcut === 'quick-command') {
        const composer = document.querySelector('textarea');
        if (composer) composer.focus();
      } else if (shortcut === 'stop-speaking') {
        handleStopSpeaking();
      }
    });
  }, [handleNewChat, handleMicrophoneClick, handleStopSpeaking]);

  const handleImageCreation = () => setIsImageModalOpen(true);
  const handleProjects = () => showToast('Projects feature coming soon!', 'info');
  const handleImages = () => showToast('Image gallery coming soon!', 'info');
  const handleAddFile = () => showToast('File upload feature coming soon!', 'info');
  const handleGenerateImage = () => setIsImageModalOpen(true);
  const handleImageGenerate = (prompt: string, imageUrl: string) => {
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: `Generate image: ${prompt}`,
      timestamp: new Date(),
    };
    const aiMsg: Message = {
      id: `msg-${Date.now()}-ai`,
      role: 'assistant',
      content: `Here is the image you requested for **"${prompt}"**:\n\n![${prompt}](${imageUrl})`,
      timestamp: new Date(),
    };

    let convId = currentConversationIdRef.current;
    if (!convId || !conversationsRef.current.find(c => c.id === convId)) {
      const newConv = createNewConversation(userMsg);
      newConv.messages.push(aiMsg);
      convId = newConv.id;
      setConversations(prev => [newConv, ...prev]);
      setCurrentConversationId(convId);
    } else {
      setConversations(prev =>
        prev.map(c => {
          if (c.id !== convId) return c;
          return {
            ...c,
            updatedAt: new Date(),
            messages: [...c.messages, userMsg, aiMsg],
          };
        })
      );
    }
    showToast('🎨 Image generated successfully!', 'success');
  };
  const handleSelectPhoto = () => showToast('Photo selection feature coming soon!', 'info');

  const handleSaveProfile = (updatedUser: User) => {
    setUser(updatedUser);
    saveUser(updatedUser);
    saveUserToFirebase(updatedUser); // cloud sync
    showToast('Profile updated successfully!', 'success');
  };

  const handleSelectConversation = (id: string) => {
    setCurrentView('chat');
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    if (currentConversationId === id) setCurrentConversationId(null);
    showToast('Conversation deleted', 'success');
  };

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [];

  const sortedConversations = [...conversations].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#070D18' }}>
      <Sidebar
        user={user}
        conversations={sortedConversations}
        currentConversationId={currentConversationId}
        currentView={currentView}
        onNewChat={handleNewChat}
        onPDFReader={() => setCurrentView('pdf-reader')}
        onCodeAssistant={() => setCurrentView('code-assistant')}
        onImageCreation={handleImageCreation}
        onProjects={handleProjects}
        onImages={handleImages}
        onCalendar={() => setIsCalendarOpen(true)}
        onEditProfile={() => setIsProfileModalOpen(true)}
        onSelectConversation={handleSelectConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {currentView === 'pdf-reader' ? (
        <PDFReader user={user} onBackToChat={() => setCurrentView('chat')} />
      ) : currentView === 'code-assistant' ? (
        <CodeAssistant user={user} onBackToChat={() => setCurrentView('chat')} />
      ) : (
        <MainWorkspace
          agentName={AGENT_NAME}
          voiceState={voiceState}
          onMicrophoneClick={handleMicrophoneClick}
          onStopSpeaking={handleStopSpeaking}
          onSendMessage={handleSendMessage}
          onAddFile={handleAddFile}
          onGenerateImage={handleGenerateImage}
          onSelectPhoto={handleSelectPhoto}
          onPDFReader={() => setCurrentView('pdf-reader')}
          messages={messages}
          isTyping={isTyping}
          onToggleSidebar={() => setIsSidebarOpen(true)}
          userName={user.nickname || user.fullName || user.username}
        />
      )}

      {/* Right panel — hidden on small screens */}
      <div className="hidden xl:block">
        <RightPanel
          userName={user.nickname || user.username}
          conversations={conversations}
          onSendMessage={handleSendMessage}
        />
      </div>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onSave={handleSaveProfile}
      />

      <ImageGenerationModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onGenerate={handleImageGenerate}
      />

      <CalendarModal
        isOpen={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
