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
  onIdle?: () => void;
  onErrorLimit?: () => void;
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
const MERGE_WINDOW_MS = 800;
const MAX_MERGE_ROUNDS = 4;
const MAX_CONSECUTIVE_ERRORS = 3;
const IDLE_TIMEOUT_MS = 180000;  // 3 分钟

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

  useEffect(() => {
    const strategy = getDefaultStrategy();
    createTranslationService({
      strategy,
      baiduAppId: strategy === 'baidu' ? (import.meta as any).env?.VITE_BAIDU_APP_ID || "" : undefined,
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

    const mergeBuffer: string[] = [];
    let mergeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastMergeTimestamp = 0;
    let previousIncomplete = "";
    let mergeRounds = 0;

    // 错误计数
    let consecutiveErrors = 0;

    // 空闲检测
    let idleTimer: ReturnType<typeof setTimeout> | null = null;
    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        optionsRef.current.onIdle?.();
      }, IDLE_TIMEOUT_MS);
    };
    resetIdleTimer();

    const emitSentence = (sourceText: string, timestamp: number) => {
      resetIdleTimer();
      consecutiveErrors = 0;  // 成功发射，重置错误计数
      if (optionsRef.current.onFinalSentence) {
        const id = optionsRef.current.onFinalSentence(sourceText, timestamp);
        if (id && translateRef.current) {
          translateRef.current.translate(sourceText).then(translated => {
            optionsRef.current.onTranslationReady?.(id, translated);
          }).catch(err => {
            console.warn('[Hook] translate failed:', err);
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
          }).catch(() => {});
        }
      }
    };

    const flushMerged = async () => {
      const fragments = mergeBuffer.splice(0);
      if (fragments.length === 0 && !previousIncomplete) return;

      const combined = previousIncomplete
        ? previousIncomplete + " " + fragments.join(" ")
        : fragments.join(" ");

      const trimmed = combined.trim();
      if (!trimmed) return;

      const timestamp = lastMergeTimestamp || Date.now();

      let sourceText = trimmed;
      let incomplete = false;
      const processor = optionsRef.current.asrPostProcessor;
      if (processor) {
        try {
          const result = await processor.correct(trimmed);
          sourceText = result.text || trimmed;
          incomplete = result.incomplete;
        } catch { /* fallback */ }
      }

      if (incomplete && mergeRounds < MAX_MERGE_ROUNDS) {
        previousIncomplete = sourceText;
        mergeRounds++;
      } else {
        if (sourceText.trim()) {
          emitSentence(sourceText.trim(), timestamp);
        }
        previousIncomplete = "";
        mergeRounds = 0;
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

            // 过滤空文本
            if (!result.text.trim()) return;

            mergeBuffer.push(result.text);

            if (mergeTimer) clearTimeout(mergeTimer);
            mergeTimer = setTimeout(() => {
              mergeTimer = null;
              flushMerged();
            }, MERGE_WINDOW_MS);
          }
        },
        (err: string) => {
          console.error('[Hook] err:', err);
          consecutiveErrors++;
          if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
            setError('连续识别失败，已自动停止。请检查网络后重试');
            optionsRef.current.onErrorLimit?.();
            // 自动停止
            captureRef.current?.stopRecording();
            asrRef.current?.stop();
            captureRef.current?.stop();
            captureRef.current = null;
            asrRef.current = null;
            setIsListening(false);
            setConnectionStatus('disconnected');
          } else {
            setError(err + ' (' + consecutiveErrors + '/' + MAX_CONSECUTIVE_ERRORS + ')');
          }
        },
        () => {
          if (mergeTimer) clearTimeout(mergeTimer);
          mergeTimer = null;
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = null;
          const combined = previousIncomplete
            ? previousIncomplete + " " + mergeBuffer.join(" ")
            : mergeBuffer.join(" ");
          if (combined.trim()) {
            emitSentence(combined.trim(), lastMergeTimestamp || Date.now());
          }
          mergeBuffer.length = 0;
          previousIncomplete = "";
          mergeRounds = 0;
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
