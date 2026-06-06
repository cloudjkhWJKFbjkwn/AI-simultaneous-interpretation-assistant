/** 字幕条目状态 */
export type SubtitleStatus = "interim" | "final";

/** 语音识别结果事件 */
export interface SpeechResult {
  type: "interim" | "final";
  text: string;
  timestamp: number;
}

/** 字幕条目 */
export interface SubtitleItem {
  id: string;
  sourceText: string;
  translatedText: string;
  timestamp: number;
  marked: boolean;
  version: number;
  status: SubtitleStatus;
}

/** 字幕操作类型 */
export type SubtitleAction =
  | { type: "add"; item: SubtitleItem }
  | { type: "correct"; id: string; newTranslatedText: string }
  | { type: "toggleMark"; id: string }
  | { type: "updateStatus"; id: string; status: SubtitleStatus }
  | { type: "edit"; id: string; sourceText?: string; translatedText?: string }
  | { type: "clear" };

/** 翻译服务接口 */
export interface TranslationService {
  translate(text: string): Promise<string>;
}

/** 修正触发器配置 */
export interface CorrectionConfig {
  triggerWords: string[];
  lookbackCount: number;
}
