import type { LlmService } from "./LlmService";

const SYSTEM_PROMPT =
  "You are an English text corrector. Fix speech recognition errors:\n" +
  "- Fix homophone errors (e.g. 'their'→'there', 'to'→'too', 'its'→'it\\'s')\n" +
  "- Fix obvious misspellings and grammar breaks\n" +
  "- Add missing punctuation (periods, commas) where natural\n" +
  "- Capitalize proper nouns and sentence starts\n" +
  "- Do NOT change word choice or meaning\n" +
  "- Do NOT add articles or prepositions that change intent\n" +
  "- Return ONLY the corrected text, no explanation\n" +
  "- If the text is already perfect, return it unchanged";

/**
 * ASR 后处理器 — 用 LLM 清洗语音识别文本
 */
export class AsrPostProcessor {
  private llm: LlmService;

  constructor(llm: LlmService) {
    this.llm = llm;
  }

  /** 纠正 ASR 识别错误，返回清洗后的文本 */
  async correct(text: string): Promise<string> {
    if (!text || text.length < 3) return text;

    try {
      const result = await this.llm.chat([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ]);
      return result.trim() || text;
    } catch (e) {
      console.warn("[AsrPostProcessor] LLM correction failed, using original:", e);
      return text; // 兜底：返回原文
    }
  }
}
