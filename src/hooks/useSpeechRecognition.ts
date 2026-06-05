import { useRef, useState, useCallback } from 'react';
import { AudioCapture } from '../services/AudioCapture';
import { SpeechRecognitionService } from '../services/SpeechRecognitionService';
import type { SpeechResult } from '../types';

interface UseSpeechRecognitionReturn {
  /** 最终识别文本（稳定的句子） */
  finalText: string;
  /** 中间识别文本（不稳定的预览） */
  interimText: string;
  /** 所有已完成的句子列表 */
  completedSentences: string[];
  /** 是否正在监听 */
  isListening: boolean;
  /** 错误信息 */
  error: string | null;
  /** 浏览器是否支持 */
  isSupported: boolean;
  /** 开始监听 */
  start: () => Promise<void>;
  /** 停止监听 */
  stop: () => void;
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [interimText, setInterimText] = useState('');
  const [completedSentences, setCompletedSentences] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const asrRef = useRef<SpeechRecognitionService | null>(null);
  const currentSentenceRef = useRef('');

  const isSupported = SpeechRecognitionService.isSupported();

  const start = useCallback(async () => {
    setError(null);
    setInterimText('');
    currentSentenceRef.current = '';

    try {
      const audio = new AudioCapture();
      await audio.start();
      audioCaptureRef.current = audio;

      const asr = new SpeechRecognitionService();
      asrRef.current = asr;

      asr.start(
        (result: SpeechResult) => {
          if (result.type === 'interim') {
            setInterimText(result.text);
          } else {
            // final 结果
            setInterimText('');
            setCompletedSentences((prev) => [...prev, result.text]);
            currentSentenceRef.current += ' ' + result.text;
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
    } catch (err) {
      setError((err as Error).message);
      audioCaptureRef.current?.stop();
      audioCaptureRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    asrRef.current?.stop();
    asrRef.current = null;
    audioCaptureRef.current?.stop();
    audioCaptureRef.current = null;
    setIsListening(false);
    setInterimText('');
  }, []);

  // 拼接当前句子缓冲区
  const finalText = currentSentenceRef.current.trim();

  return {
    finalText,
    interimText,
    completedSentences,
    isListening,
    error,
    isSupported,
    start,
    stop,
  };
}