import { useRef, useState, useCallback } from 'react';
import { SpeechRecognitionService } from '../services/SpeechRecognitionService';
import type { SpeechResult } from '../types';

interface UseSpeechRecognitionReturn {
  interimText: string;
  completedSentences: string[];
  isListening: boolean;
  error: string | null;
  isSupported: boolean;
  start: () => Promise<void>;
  stop: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [interimText, setInterimText] = useState('');
  const [completedSentences, setCompletedSentences] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const asrRef = useRef<SpeechRecognitionService | null>(null);

  const isSupported = SpeechRecognitionService.isSupported();

  const start = useCallback(async () => {
    setError(null);
    setInterimText('');

    const asr = new SpeechRecognitionService();
    asrRef.current = asr;

    asr.start(
      (result: SpeechResult) => {
        if (result.type === 'interim') {
          setInterimText(result.text);
        } else {
          setInterimText('');
          setCompletedSentences((prev) => [...prev, result.text]);
        }
      },
      (err: string) => {
        setError(err);
      },
      () => {
        setIsListening(false);
      }
    );

    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    asrRef.current?.stop();
    asrRef.current = null;
    setIsListening(false);
    setInterimText('');
  }, []);

  return {
    interimText,
    completedSentences,
    isListening,
    error,
    isSupported,
    start,
    stop,
  };
}