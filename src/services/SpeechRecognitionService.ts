import type { SpeechResult } from '../types';
import { PunctuationService } from './PunctuationService';

export type RecognitionCallback = (result: SpeechResult) => void;
export type ErrorCallback = (error: string) => void;
export type EndCallback = () => void;
export type StatusCallback = (status: 'connecting' | 'connected' | 'disconnected') => void;

const SILENCE_THRESHOLD = 600;
const SILENCE_FRAMES = 8;         // ~1 秒静音触发发送
const MAX_INTERVAL = 3000;        // 最长 3 秒也发送

export class SpeechRecognitionService {
  private _isActive = false;
  private onResult: RecognitionCallback | null = null;
  private onError: ErrorCallback | null = null;
  private onEnd: EndCallback | null = null;
  private onStatus: StatusCallback | null = null;
  private audioChunks: Int16Array[] = [];
  private silenceCount = 0;
  private lastSendTime = 0;
  private sendTimer: ReturnType<typeof setInterval> | null = null;
  private rate: number = 16000;
  private textBuffer = '';

  get isActive(): boolean { return this._isActive; }
  static isSupported(): boolean { return true; }

  async start(
    onResult: RecognitionCallback, onError: ErrorCallback, onEnd: EndCallback, onStatus?: StatusCallback,
    actualRate?: number
  ): Promise<void> {
    if (this._isActive) return;
    this.onResult = onResult; this.onError = onError; this.onEnd = onEnd; this.onStatus = onStatus || null;
    this.audioChunks = []; this.silenceCount = 0; this.textBuffer = '';
    this.rate = actualRate || 16000; this.lastSendTime = Date.now();

    this.onStatus?.('connecting');
    const res = await fetch('/api/baidu-token');
    if (!res.ok) { const d = await res.json().catch(() => ({})); onError('Token failed'); return; }

    this._isActive = true;
    this.onStatus?.('connected');
    this.sendTimer = setInterval(() => this.checkInterval(), 500);
  }

  private checkInterval(): void {
    if (!this._isActive) return;
    if (Date.now() - this.lastSendTime > MAX_INTERVAL && this.audioChunks.length > 0) {
      this.flushAudio();
    }
  }

  private rms(samples: Int16Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / samples.length);
  }

  private segmentSentences(text: string): string[] {
    if (!text) return [];
    const sentences: string[] = [];
    // Split on sentence-ending punctuation
    const parts = text.split(/(?<=[.!?])\s+/);
    let buf = '';
    for (const part of parts) {
      buf += (buf ? ' ' : '') + part;
      if (/[.!?]$/.test(buf.trim())) {
        sentences.push(buf.trim());
        buf = '';
      }
    }
    if (buf.trim()) sentences.push(buf.trim());
    return sentences;
  }

  private processText(newPunctuatedChunk: string): void {
    // Append punctuated chunk to buffer
    this.textBuffer += (this.textBuffer ? ' ' : '') + newPunctuatedChunk;

    // Segment into sentences
    const sentences = this.segmentSentences(this.textBuffer);

    // Emit complete sentences (all but possibly the last)
    const completeCount = sentences.length > 1 ? sentences.length - 1 : 0;
    for (let i = 0; i < completeCount; i++) {
      this.onResult?.({ type: 'final', text: sentences[i], timestamp: Date.now() });
    }

    // Keep only the last fragment in the buffer
    this.textBuffer = sentences.length > 0 ? sentences[sentences.length - 1] : '';

    // Show the last fragment as interim (if not empty)
    if (this.textBuffer) {
      this.onResult?.({ type: 'interim', text: this.textBuffer, timestamp: Date.now() });
    }
  }

  private async flushAudio(): Promise<void> {
    const chunks = this.audioChunks.splice(0);
    this.lastSendTime = Date.now();
    this.silenceCount = 0;

    let totalLen = 0;
    for (const c of chunks) totalLen += c.length;
    if (totalLen === 0) return;

    const combined = new Int16Array(totalLen);
    let off = 0;
    for (const c of chunks) { combined.set(c, off); off += c.length; }

    try {
      const r = await fetch('/api/baidu-asr', {
        method: 'POST', headers: { 'X-Audio-Rate': String(this.rate) }, body: combined.buffer,
      });
      const d = await r.json() as any;
      if (d.err_no === 0 && d.result?.length > 0) {
        const raw = d.result[0].trim();
        if (raw) {
          const punctuated = PunctuationService.restore(raw);
          this.processText(punctuated);
        }
      }
    } catch (e) { /* ignore */ }
  }

  sendAudio(pcmData: Int16Array): void {
    if (!this._isActive) return;
    const vol = this.rms(pcmData);
    if (vol < SILENCE_THRESHOLD) {
      this.silenceCount++;
      if (this.silenceCount >= SILENCE_FRAMES && this.audioChunks.length > 0) {
        this.flushAudio();
      }
    } else {
      this.silenceCount = 0;
      this.audioChunks.push(pcmData);
    }
  }

  stop(): void {
    if (this.sendTimer) { clearInterval(this.sendTimer); this.sendTimer = null; }
    this._isActive = false;
    this.onStatus?.('disconnected');
    this.flushAudio().then(() => {
      // Emit any remaining text in buffer as final
      if (this.textBuffer.trim()) {
        this.onResult?.({ type: 'final', text: this.textBuffer.trim(), timestamp: Date.now() });
        this.textBuffer = '';
      }
      this.onEnd?.();
    });
  }
}
