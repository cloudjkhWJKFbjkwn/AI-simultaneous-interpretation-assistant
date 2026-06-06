import { useRef, useState, useCallback, useEffect } from 'react';
import { SpeechRecognitionService } from '../services/SpeechRecognitionService';
import { AudioCapture } from '../services/AudioCapture';
import { createTranslationService, getDefaultStrategy } from '../services/TranslationService';
import type { SpeechResult, SubtitleItem, TranslationService } from '../types';
import type { AsrPostProcessor } from '../services/AsrPostProcessor';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

interface UseSpeechRecognitionOptions {
  onFinalSentence?: (sourceText: string, timestamp: number) => string | undefined;
  onTranslationReady?: (id: string, translatedText: string) => void;
  asrPostProcessor?: AsrPostProcessor | null;
}

interface UseSpeechRecognitionReturn {
  interimText: string;
  completedSentences: SubtitleItem[];
  isListening: boolean;
  error: string | null;
  isSupported: boolean;
  connectionStatus: ConnectionStatus;
  start: () => Promise<void>;
  stop: () => void;
}

const BUFFER_SIZE = 4096;
const SAMPLE_RATE = 16000;
const MERGE_WINDOW_MS = 1200;

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const [interimText, setInterimText] = useState('');
  const [completedSentences, setCompletedSentences] = useState<SubtitleItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const asrRef = useRef<SpeechRecognitionService | null>(null);
  const captureRef = useRef<AudioCapture | null>(null);
  const translateRef = useRef<TranslationService | null>(null);
  const isSupported = SpeechRecognitionService.isSupported();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // 初始化翻译服务
  useEffect(() => {
    const strategy = getDefaultStrategy();
    createTranslationService({
      strategy,
      baiduAppId: strategy === 'baidu' ? '20260605002626604' : undefined,
    }).then(svc => {
      translateRef.current = svc;
    });
  }, []);

  const start = useCallback(async () => {
    console.log('[Hook] start() called');
    setError(null); setInterimText(''); setCompletedSentences([]);
    setConnectionStatus('connecting');
    const capture = new AudioCapture();
    const asr = new SpeechRecognitionService();
    captureRef.current = capture; asrRef.current = asr;

    // 碎片缓冲 + 防抖合并
    const mergeBuffer: string[] = [];
    let mergeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastMergeTimestamp = 0;

    const flushMerged = async () => {
      if (mergeBuffer.length === 0) return;
      const combined = mergeBuffer.splice(0).join(" ");
      if (!combined.trim()) return;

      const timestamp = lastMergeTimestamp || Date.now();

      // LLM 后处理
      let sourceText = combined;
      const processor = optionsRef.current.asrPostProcessor;
      if (processor) {
        try { sourceText = await processor.correct(combined); }
        catch { /* fallback */ }
      }

      // 创建字幕
      if (optionsRef.current.onFinalSentence) {
        const id = optionsRef.current.onFinalSentence(sourceText, timestamp);
        if (id && translateRef.current) {
          translateRef.current.translate(sourceText).then(translated => {
            optionsRef.current.onTranslationReady?.(id, translated);
          });
        }
      } else {
        const item: SubtitleItem = {
          id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
          sourceText,
          translatedText: '',
          timestamp,
          marked: false,
          corrected: false,
          version: 0,
          status: 'final',
        };
        setCompletedSentences(prev => [...prev, item]);
        if (translateRef.current) {
          translateRef.current.translate(sourceText).then(translated => {
            setCompletedSentences(prev =>
              prev.map(s => s.id === item.id ? { ...s, translatedText: translated } : s)
            );
          });
        }
      }
    };

    try {
      await capture.start();
      capture.startRecording(SAMPLE_RATE, BUFFER_SIZE, (pcmData: Int16Array) => { asr.sendAudio(pcmData); });
      await new Promise(r => setTimeout(r, 200));
      await asr.start(
        async (result: SpeechResult) => {
          if (result.type === 'interim') {
            setInterimText(result.text);
          } else {
            setInterimText('');
            lastMergeTimestamp = result.timestamp;

            // 防抖合并：把碎片加入缓冲，延迟 N ms 后一起处理
            mergeBuffer.push(result.text);

            if (mergeTimer) clearTimeout(mergeTimer);
            mergeTimer = setTimeout(() => {
              mergeTimer = null;
              flushMerged();
            }, MERGE_WINDOW_MS);
          }
        },
        (err: string) => { console.error('[Hook] err:', err); setError(err); },
        () => {
          // Stop: flush remaining buffer
          if (mergeTimer) clearTimeout(mergeTimer);
          mergeTimer = null;
          flushMerged();
          setConnectionStatus('disconnected');
          setIsListening(false);
        },
        (s: ConnectionStatus) => setConnectionStatus(s),
        capture.actualSampleRate
      );
      setIsListening(true);
    } catch (err) { setError((err as Error).message); setConnectionStatus('disconnected'); capture.stop(); }
  }, []);

  const stop = useCallback(() => {
    captureRef.current?.stopRecording(); asrRef.current?.stop(); captureRef.current?.stop();
    captureRef.current = null; asrRef.current = null;
    setIsListening(false); setInterimText(''); setConnectionStatus('idle');
  }, []);

  return { interimText, completedSentences, isListening, error, isSupported, connectionStatus, start, stop };
}
