export type AudioDataCallback = (pcmData: Int16Array) => void;

export class AudioCapture {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private scriptNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private _isActive = false;
  actualSampleRate: number = 16000;

  get isActive(): boolean { return this._isActive; }

  async start(): Promise<void> {
    if (this._isActive) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000, channelCount: 1 },
      });
      this._isActive = true;
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotAllowedError') throw new Error('麦克风权限被拒绝');
      if (err.name === 'NotFoundError') throw new Error('未检测到麦克风设备');
      throw new Error('音频捕获失败: ' + err.message);
    }
  }

  startRecording(sampleRate: number, bufferSize: number, onData: AudioDataCallback): void {
    if (!this.stream) throw new Error('请先调用 start()');
    this.stopRecording();

    this.audioContext = new AudioContext({ sampleRate });
    this.actualSampleRate = this.audioContext.sampleRate;
    console.log('[Audio] Context sampleRate=', this.actualSampleRate);

    this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
    this.scriptNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    this.scriptNode.onaudioprocess = (event: AudioProcessingEvent) => {
      if (!this._isActive) return;
      const inputData = event.inputBuffer.getChannelData(0);
      const int16Data = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      onData(int16Data);
    };
    this.sourceNode.connect(this.scriptNode);
    this.scriptNode.connect(this.audioContext.destination);
  }

  stopRecording(): void {
    if (this.scriptNode) { this.scriptNode.disconnect(); this.scriptNode = null; }
    if (this.sourceNode) { this.sourceNode.disconnect(); this.sourceNode = null; }
    if (this.audioContext) { this.audioContext.close().catch(() => {}); this.audioContext = null; }
  }

  stop(): void {
    this.stopRecording();
    if (this.stream) { this.stream.getTracks().forEach(t => t.stop()); this.stream = null; }
    this._isActive = false;
  }
}
