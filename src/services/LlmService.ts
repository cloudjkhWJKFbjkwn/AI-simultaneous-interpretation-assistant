/** LLM 聊天消息 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** LLM 服务接口 — 方便后续切换模型 */
export interface LlmService {
  /** 发送消息并获取回复文本 */
  chat(messages: ChatMessage[]): Promise<string>;
}
