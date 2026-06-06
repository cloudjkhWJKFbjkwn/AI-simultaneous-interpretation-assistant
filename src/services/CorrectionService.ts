import type { CorrectionConfig } from "../types";

const DEFAULT_TRIGGER_WORDS = [
  "but", "however", "actually", "in fact", "i mean",
  "though", "although", "instead", "rather", "on the other hand",
  "nevertheless", "nonetheless", "conversely", "that said",
  "having said that", "the truth is", "to be honest", "to be fair",
];

const DEFAULT_CONFIG: CorrectionConfig = {
  triggerWords: DEFAULT_TRIGGER_WORDS,
  lookbackCount: 2,
  minSentenceLength: 10,
};

/**
 * 检查文本是否包含转折词
 */
function containsTrigger(text: string, triggerWords: string[]): boolean {
  const lower = text.toLowerCase().trim();
  return triggerWords.some((word) => {
    const regex = new RegExp("\\b" + word.replace(/\s+/g, "\\s+") + "\\b", "i");
    return regex.test(lower);
  });
}

/**
 * CorrectionService — 上下文修正引擎
 *
 * 当新句子包含转折词（but, however, actually...）时，
 * 将前面的句子连同当前句子作为上下文，重新请求翻译引擎，
 * 修正前方句子因缺少后文语境而产生的翻译偏差。
 */
export class CorrectionService {
  private config: CorrectionConfig;
  private processingSet: Set<string> = new Set();

  constructor(config?: Partial<CorrectionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  get lookbackCount(): number {
    return this.config.lookbackCount;
  }

  /** 判断新句子是否触发上下文修正 */
  shouldCorrect(text: string): boolean {
    if (text.length < this.config.minSentenceLength) return false;
    return containsTrigger(text, this.config.triggerWords);
  }

  /**
   * 为前方句子构建修正上下文
   * @param previousSource 前方句子的原文
   * @param currentSource  当前句子的原文（含转折词）
   * @returns 拼接后的上下文字符串，传给翻译引擎
   */
  buildCorrectionContext(previousSource: string, currentSource: string): string {
    return "Context (re-evaluate the first sentence considering the second):\n"
      + "Sentence to correct: \"" + previousSource + "\"\n"
      + "New context: \"" + currentSource + "\"\n"
      + "Please re-translate only the first sentence.";
  }

  /** 标记某句子正在被修正，避免重复修正 */
  markProcessing(id: string): boolean {
    if (this.processingSet.has(id)) return false;
    this.processingSet.add(id);
    return true;
  }

  /** 修正完成，清除标记 */
  clearProcessing(id: string): void {
    this.processingSet.delete(id);
  }

  /** 重置处理状态（停止监听时调用） */
  reset(): void {
    this.processingSet.clear();
  }
}
