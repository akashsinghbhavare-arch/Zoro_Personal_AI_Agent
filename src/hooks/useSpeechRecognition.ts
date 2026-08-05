import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionResult {
  transcript: string;
  isListening: boolean;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  error: string | null;
}

interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

/**
 * Robust Speech Recognition Hook with Network Error Auto-Recovery
 * @param onTranscript  callback fired when speech is finalized
 * @param lang          BCP-47 language tag — 'en-US' | 'hi-IN' | 'auto'
 */
export const useSpeechRecognition = (
  onTranscript?: (text: string) => void,
  lang: string = 'auto'
): SpeechRecognitionResult => {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const langRef = useRef(lang);
  langRef.current = lang;

  const userWantsToListenRef = useRef(false);
  const retryCountRef = useRef(0);
  const lastInterimRef = useRef('');
  const isStartingRef = useRef(false);

  const win = typeof window !== 'undefined' ? (window as IWindow) : {};
  const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
  const isSupported = Boolean(SpeechRecognition);

  const getLanguage = useCallback(() => {
    if (!langRef.current || langRef.current === 'auto') {
      return (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
    }
    return langRef.current;
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = getLanguage();

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      retryCountRef.current = 0;
      isStartingRef.current = false;
    };

    let finalFired = false;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      if (interimTranscript.trim()) {
        lastInterimRef.current = interimTranscript.trim();
      }

      // Fire immediately on a final result
      if (finalTranscript.trim()) {
        finalFired = true;
        lastInterimRef.current = '';
        if (debounceTimer) clearTimeout(debounceTimer);
        setTranscript(finalTranscript.trim());
        onTranscriptRef.current?.(finalTranscript.trim());
        userWantsToListenRef.current = false;
        try { recognition.stop(); } catch {}
        return;
      }

      // For interim results: debounce 500ms of silence → treat as final
      if (interimTranscript.trim()) {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          if (!finalFired && interimTranscript.trim()) {
            finalFired = true;
            const captured = interimTranscript.trim();
            lastInterimRef.current = '';
            setTranscript(captured);
            onTranscriptRef.current?.(captured);
            userWantsToListenRef.current = false;
            try { recognition.stop(); } catch {}
          }
        }, 500);
      }
    };

    recognition.onerror = (event: any) => {
      const errType = event.error;

      if (errType === 'no-speech') {
        // Not a fatal error — silence detected
        setIsListening(false);
        return;
      }

      if (errType === 'network' || errType === 'aborted') {
        console.warn(`[SpeechRecognition] Non-fatal ${errType} event. Attempting recovery...`);

        // If user already spoke interim text before network drop, process it
        if (lastInterimRef.current) {
          const pendingText = lastInterimRef.current;
          lastInterimRef.current = '';
          setTranscript(pendingText);
          onTranscriptRef.current?.(pendingText);
          userWantsToListenRef.current = false;
          setIsListening(false);
          return;
        }

        // Auto-reconnect if user still wants to listen
        if (userWantsToListenRef.current && retryCountRef.current < 3) {
          retryCountRef.current += 1;
          setTimeout(() => {
            if (userWantsToListenRef.current && recognitionRef.current) {
              try {
                recognitionRef.current.lang = getLanguage();
                recognitionRef.current.start();
              } catch (err) {
                // Ignore already started error
              }
            }
          }, 400 * retryCountRef.current);
          return;
        }
      }

      console.error('[SpeechRecognition] Fatal error:', errType);
      setError(errType);
      setIsListening(false);
      userWantsToListenRef.current = false;
    };

    recognition.onend = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      setIsListening(false);
      isStartingRef.current = false;

      // Auto-restart if session ended unexpectedly while listening was requested
      if (userWantsToListenRef.current && retryCountRef.current < 3) {
        retryCountRef.current += 1;
        setTimeout(() => {
          if (userWantsToListenRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.lang = getLanguage();
              recognitionRef.current.start();
            } catch {}
          }
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      userWantsToListenRef.current = false;
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, [isSupported, getLanguage]);

  const startListening = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      return;
    }

    userWantsToListenRef.current = true;
    retryCountRef.current = 0;
    lastInterimRef.current = '';
    setError(null);

    if (recognitionRef.current && !isStartingRef.current) {
      try {
        recognitionRef.current.lang = getLanguage();
        isStartingRef.current = true;
        recognitionRef.current.start();
      } catch (err: any) {
        isStartingRef.current = false;
        // If already started, we are already listening cleanly
        if (err?.name !== 'InvalidStateError') {
          console.warn('[SpeechRecognition] Start warning:', err);
        }
      }
    }
  }, [isSupported, getLanguage]);

  const stopListening = useCallback(() => {
    userWantsToListenRef.current = false;
    lastInterimRef.current = '';
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  return {
    transcript,
    isListening,
    isSupported,
    startListening,
    stopListening,
    error,
  };
};
