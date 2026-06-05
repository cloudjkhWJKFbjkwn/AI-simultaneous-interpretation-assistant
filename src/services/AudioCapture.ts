/**
 * 音频捕获模块
 * 负责获取麦克风权限，提供开始/停止控制
 */
export class AudioCapture {
  private stream: MediaStream | null = null;
  private _isActive = false;

  get isActive(): boolean {
    return this._isActive;
  }

  /** 请求麦克风权限并开始捕获 */
  async start(): Promise<void> {
    if (this._isActive) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this._isActive = true;
    } catch (error) {
      const err = error as Error;
      if (err.name === 'NotAllowedError') {
        throw new Error('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
      }
      if (err.name === 'NotFoundError') {
        throw new Error('未检测到麦克风设备');
      }
      throw new Error(`音频捕获失败: ${err.message}`);
    }
  }

  /** 停止捕获并释放资源 */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this._isActive = false;
  }

  /** 获取媒体流（供 SpeechRecognition 使用） */
  getStream(): MediaStream | null {
    return this.stream;
  }
}