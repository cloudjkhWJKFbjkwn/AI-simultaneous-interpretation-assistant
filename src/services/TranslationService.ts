import type { TranslationService } from "../types";
import { MockTranslationService } from "./MockTranslationService";

export type TranslationStrategy = "mock" | "baidu";

export interface TranslationConfig {
  strategy: TranslationStrategy;
  baiduAppId?: string;
}

/** LRU 缓存节点 */
interface CacheNode {
  value: string;
  prev: string | null;
  next: string | null;
}

/** 带 LRU 缓存的翻译服务包装器 */
class CachedTranslationService implements TranslationService {
  private inner: TranslationService;
  private cache: Map<string, CacheNode>;
  private head: string | null = null;
  private tail: string | null = null;
  private maxSize: number;

  constructor(inner: TranslationService, maxSize = 500) {
    this.inner = inner;
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  private normalizeKey(text: string): string {
    return text
      .toLowerCase()
      .replace(/[,.!?;:'"()\[\]{}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  private touch(key: string): void {
    const node = this.cache.get(key);
    if (!node) return;

    // 已经是头部
    if (this.head === key) return;

    // 断链
    if (node.prev) this.cache.get(node.prev)!.next = node.next;
    if (node.next) this.cache.get(node.next)!.prev = node.prev;

    // 如果是尾部，更新 tail
    if (this.tail === key) this.tail = node.prev;

    // 插入头部
    node.prev = null;
    node.next = this.head;
    if (this.head) this.cache.get(this.head)!.prev = key;
    this.head = key;

    // 如果之前没有 tail（链表为空）
    if (!this.tail) this.tail = key;
  }

  private evict(): void {
    if (this.tail && this.cache.size >= this.maxSize) {
      const toEvict = this.tail;
      const node = this.cache.get(toEvict)!;
      this.tail = node.prev;
      if (this.tail) this.cache.get(this.tail)!.next = null;
      if (this.head === toEvict) this.head = null;
      this.cache.delete(toEvict);
    }
  }

  private addEntry(key: string, value: string): void {
    this.evict();

    const node: CacheNode = { value, prev: null, next: this.head };
    if (this.head) this.cache.get(this.head)!.prev = key;
    this.head = key;
    if (!this.tail) this.tail = key;
    this.cache.set(key, node);
  }

  async translate(text: string): Promise<string> {
    const key = this.normalizeKey(text);
    if (!key) return text;

    const cached = this.cache.get(key);
    if (cached) {
      this.touch(key);
      return cached.value;
    }

    const result = await this.inner.translate(text);
    this.addEntry(key, result);
    return result;
  }
}

/** 根据配置创建翻译服务实例 */
export async function createTranslationService(
  config: TranslationConfig
): Promise<TranslationService> {
  let inner: TranslationService;

  switch (config.strategy) {
    case "baidu":
      if (!config.baiduAppId) {
        console.warn(
          "[翻译] 缺少 BAIDU_APP_ID，回退到 Mock 模式"
        );
        inner = new MockTranslationService();
      } else {
        const { BaiduTranslationService } = await import(
          "./BaiduTranslationService"
        );
        inner = new BaiduTranslationService(config.baiduAppId);
      }
      break;
    case "mock":
    default:
      inner = new MockTranslationService();
  }

  console.log("[翻译] 策略: " + config.strategy);
  return new CachedTranslationService(inner);
}

/** 获取默认翻译策略 */
export function getDefaultStrategy(): TranslationStrategy {
  const env = (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_TRANSLATION_STRATEGY) || "mock";
  return env === "baidu" ? "baidu" : "mock";
}
