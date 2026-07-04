import { useState, useRef, useCallback, useEffect } from 'react';

export type SpeechStatus = 'idle' | 'requesting' | 'recording' | 'denied' | 'unsupported';

interface UseSpeechRecognitionOptions {
  onTranscript: (text: string) => void;
}

// ─── Web Speech API type declarations ────────────────────────────────────────

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResult {
  readonly 0: SpeechRecognitionAlternative;
  readonly length: number;
  readonly isFinal: boolean;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface SpeechRecognitionConstructor {
  new(): ISpeechRecognition;
}

const SpeechRecognitionClass: SpeechRecognitionConstructor | undefined =
  typeof window !== 'undefined'
    ? ((window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition)
    : undefined;

export function useSpeechRecognition({ onTranscript }: UseSpeechRecognitionOptions) {
  const [status, setStatus] = useState<SpeechStatus>(
    SpeechRecognitionClass ? 'idle' : 'unsupported',
  );
  const recognizerRef = useRef<ISpeechRecognition | null>(null);
  // Track whether WE initiated the stop (vs browser auto-stopping)
  const stoppingRef = useRef(false);

  // Hard-stop and release mic on unmount
  useEffect(() => {
    return () => {
      stoppingRef.current = true;
      recognizerRef.current?.stop();
      recognizerRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    recognizerRef.current?.stop();
    recognizerRef.current = null;
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (!SpeechRecognitionClass) { setStatus('unsupported'); return; }

    setStatus('requesting');
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setStatus('denied');
      return;
    }

    const recognizer = new SpeechRecognitionClass();
    // continuous: true — keeps recording until stop() is explicitly called.
    // Without this, the browser auto-stops after a pause and resets UI to "idle"
    // while the mic indicator stays on, confusing the user.
    recognizer.continuous = true;
    recognizer.interimResults = false;
    recognizer.lang = navigator.language || 'en-US';
    recognizer.maxAlternatives = 1;

    recognizer.onresult = (event: SpeechRecognitionEvent) => {
      // With continuous mode, event.resultIndex points to the NEWLY added results.
      // Iterating from 0 would double-append all previous utterances.
      const parts: string[] = [];
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          parts.push(event.results[i][0].transcript);
        }
      }
      const transcript = parts.join(' ').trim();
      if (transcript) onTranscript(transcript);
    };

    recognizer.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStatus('denied');
      } else {
        setStatus('idle');
      }
      recognizerRef.current = null;
    };

    recognizer.onend = () => {
      // Only reset to idle if the browser stopped us unexpectedly (not via our stop() call).
      // stoppingRef prevents a double-setState when we call stop() ourselves.
      if (!stoppingRef.current) {
        setStatus('idle');
      }
      stoppingRef.current = false;
      recognizerRef.current = null;
    };

    stoppingRef.current = false;
    recognizerRef.current = recognizer;
    recognizer.start();
    setStatus('recording');
  }, [onTranscript]);

  const toggle = useCallback(() => {
    if (status === 'recording') stop();
    else if (status === 'idle') start();
    // ignore clicks while 'requesting' to avoid starting a second recognizer
  }, [status, start, stop]);

  return { status, toggle, stop };
}
