import type { LlmService } from "./LlmService";

const SYSTEM_PROMPT =
  "You are a speech recognition text reconstructor. Fix the following ASR output:\n\n" +
  "RULES:\n" +
  "- Merge any fragments into grammatically correct, fluent English sentences\n" +
  "- Fix homophone errors (their/there, to/too, its/it's, eye/I, seen/scene, etc.)\n" +
  "- Remove filler numbers that are list markers, not part of speech\n" +
  "- Add proper punctuation and capitalization\n" +
  "- Do NOT add or invent new content, only reconstruct what was said\n" +
  "- If multiple sentence fragments obviously belong together, combine them\n" +
  "- Return ONLY the corrected complete text, no explanations\n" +
  "- If text is already perfect, return it unchanged\n" +
  "\n" +
  "IMPORTANT: Speech-to-text often breaks long sentences into fragments. " +
  "You must look at the full input and reconstruct the most likely complete sentences.";

export class AsrPostProcessor {
  private llm: LlmService;

  constructor(llm: LlmService) {
    this.llm = llm;
  }

  /** 纠正 ASR 文本 */
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
      return text;
    }
  }

  reset(): void {}
}
