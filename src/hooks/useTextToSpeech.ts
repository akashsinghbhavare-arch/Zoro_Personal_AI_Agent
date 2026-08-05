import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseTextToSpeechOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

export interface UseTextToSpeechResult {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
}

// ── Hindi detection ────────────────────────────────────────────────────
// Devanagari Unicode block: U+0900 – U+097F
const HINDI_REGEX = /[\u0900-\u097F]/;
const isHindiText = (text: string): boolean => HINDI_REGEX.test(text);

export const useTextToSpeech = (options: UseTextToSpeechOptions = {}): UseTextToSpeechResult => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onStartRef = useRef(options.onStart);
  const onEndRef = useRef(options.onEnd);

  // Keep callbacks fresh
  onStartRef.current = options.onStart;
  onEndRef.current = options.onEnd;

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Cancel any in-progress speech on unmount
  useEffect(() => {
    return () => {
      if (isSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !text.trim()) return;

    // Cancel any previous utterance
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const hindi = isHindiText(text);

    // ── Voice Selection ──────────────────────────────────────────────
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();

      if (hindi) {
        // Prefer Google or Microsoft Hindi voices
        const preferred = voices.find(v =>
          /google|microsoft|natural|neural/i.test(v.name) && v.lang.startsWith('hi')
        );
        const hindiVoice = voices.find(v => v.lang.startsWith('hi'));
        return preferred ?? hindiVoice ?? null;
      } else {
        // Prefer Google or Microsoft English voices
        const preferred = voices.find(v =>
          /google|microsoft|natural|neural/i.test(v.name) && v.lang.startsWith('en')
        );
        const english = voices.find(v => v.lang.startsWith('en'));
        return preferred ?? english ?? voices[0] ?? null;
      }
    };

    const voice = pickVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      // Fallback: set language explicitly even without a voice object
      utterance.lang = hindi ? 'hi-IN' : 'en-US';
    }

    utterance.rate = 1.1;  // slightly faster = more natural, less latency
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      onStartRef.current?.();
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      onEndRef.current?.();
    };

    utterance.onerror = (e) => {
      // 'interrupted' fires on barge-in cancel — treat as normal end
      if (e.error === 'interrupted' || e.error === 'canceled') {
        setIsSpeaking(false);
        return;
      }
      console.warn('TTS error:', e.error);
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;

    // Pre-warm Chrome synthesis engine: speak a zero-length utterance first
    // to eliminate the first-speak delay without a setTimeout hack.
    const warmUp = new SpeechSynthesisUtterance('');
    window.speechSynthesis.speak(warmUp);
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  return { speak, stop, isSpeaking, isSupported };
};
