import type { LlmService } from "./LlmService";

const SYSTEM_PROMPT =
  "You are a speech recognition text reconstructor. Fix ASR output:\n\n" +
  "RULES:\n" +
  "- Merge fragments into grammatically correct, fluent English sentences\n" +
  "- Fix homophone errors (their/there, to/too, its/it's, eye/I, seen/scene, etc.)\n" +
  "- Remove filler numbers that are list markers\n" +
  "- Add proper punctuation and capitalization\n" +
  "- Do NOT add or invent new content\n" +
  "- Return ONLY the corrected text, no explanations\n\n" +
  "INCOMPLETE SENTENCES:\n" +
  "- If the input is OBVIOUSLY cut off mid-sentence (ends with 'and', 'but', 'or', 'the', 'a', 'to', 'for', 'in', 'on', 'that', 'because', 'so', 'when', 'if', 'then', 'about'), append '...' to signal incompleteness\n" +
  "- If the sentence appears to express a complete thought (has subject + verb + object/complement), do NOT add '...' even if it feels like more might follow\n" +
  "- Simple greetings and short expressions ('thank you', 'hello', 'yes', 'I see') are complete, no '...'\n" +
  "- If unsure, treat as complete (no '...')";

export interface CorrectionResult {
  text: string;
  incomplete: boolean;
}

export class AsrPostProcessor {
  private llm: LlmService;

  constructor(llm: LlmService) {
    this.llm = llm;
  }

  async correct(text: string): Promise<CorrectionResult> {
    if (!text || text.length < 3) return { text, incomplete: false };

    try {
      const result = await this.llm.chat([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ]);
      const corrected = result.trim() || text;
      const incomplete = corrected.endsWith("...");
      return {
        text: incomplete ? corrected.slice(0, -3).trim() : corrected,
        incomplete,
      };
    } catch (e) {
      console.warn("[AsrPostProcessor] LLM correction failed:", e);
      return { text, incomplete: false };
    }
  }

  reset(): void {}
}
