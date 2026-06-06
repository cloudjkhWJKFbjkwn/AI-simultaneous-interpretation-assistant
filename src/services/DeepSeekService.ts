import type { LlmService, ChatMessage } from "./LlmService";

/**
 * DeepSeek API 客户端（通过 Vite 代理）
 */
export class DeepSeekService implements LlmService {
  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch("/api/deepseek", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error("DeepSeek API error: " + (err.error || res.statusText));
    }

    const data = await res.json() as { content: string };
    return data.content || "";
  }
}
