import type { SpeechResult } from '../types';

/** 浏览器 SpeechRecognition API 类型声明 */
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export type RecognitionCallback = (result: SpeechResult) => void;
export type ErrorCallback = (error: string) => void;
export type EndCallback = () => void;

/**
 * 语音识别服务 (ASR)
 * 封装 Web Speech API，输出标准化的 interim/final 事件
 */
export class SpeechRecognitionService {
  private recognition: SpeechRecognition | null = null;
  private _isActive = false;
  private onResult: RecognitionCallback | null = null;
  private onError: ErrorCallback | null = null;
  private onEnd: EndCallback | null = null;

  get isActive(): boolean {
    return this._isActive;
  }

  /** 检查浏览器是否支持 SpeechRecognition */
  static isSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  /** 启动识别 */
  start(
    onResult: RecognitionCallback,
    onError: ErrorCallback,
    onEnd: EndCallback
  ): void {
    if (this._isActive) return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      onError('浏览器不支持语音识别，请使用 Chrome 或 Edge');
      return;
    }

    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.onResult = onResult;
    this.onError = onError;
    this.onEnd = onEnd;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (!text) continue;

        this.onResult?.({
          type: result.isFinal ? 'final' : 'interim',
          text,
          timestamp: Date.now(),
        });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') return; // 静默忽略
      if (event.error === 'aborted') return;
      this.onError?.(`识别错误: ${event.message || event.error}`);
    };

    this.recognition.onend = () => {
      // 如果仍处于活跃状态，自动重启（处理长时间识别中断）
      if (this._isActive && this.recognition) {
        try {
          this.recognition.start();
        } catch {
          // 忽略重启失败
        }
      } else {
        this._isActive = false;
        this.onEnd?.();
      }
    };

    try {
      this.recognition.start();
      this._isActive = true;
    } catch (error) {
      const err = error as Error;
      onError(`启动语音识别失败: ${err.message}`);
    }
  }

  /** 停止识别 */
  stop(): void {
    this._isActive = false;
    if (this.recognition) {
      this.recognition.onend = null; // 防止自动重启
      this.recognition.stop();
      this.recognition = null;
    }
  }
}