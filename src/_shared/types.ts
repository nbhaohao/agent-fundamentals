// 已就位（AI 生成）· 全课共享类型。每关 exercise 依赖这些形状，不各自重定义。

export type Role = "system" | "user" | "assistant" | "tool";

/** 一条对话消息。assistant 可带 toolCalls；tool 消息用 toolCallId 回指它响应的那次调用。 */
export interface Message {
  role: Role;
  content: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/** 模型决定调用某工具：name + 结构化参数。 */
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/** 一次工具执行的结果，回填进 messages 给模型「看」(observe)。 */
export interface ToolResult {
  toolCallId: string;
  content: string;
}

/** 模型一轮响应 = 文字 + 它想调的工具（空数组 = 模型认为任务完成）。 */
export interface LLMResponse {
  text: string;
  toolCalls: ToolCall[];
}

/** 工具描述（给模型看 name/description/参数；execute 由我们的 loop 调，不交给模型）。 */
export interface Tool {
  name: string;
  description: string;
  /** JSON Schema，给真实模型看参数形状（mock 测试用不到，可省）。 */
  parameters?: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

/**
 * LLM 抽象 —— 全课唯一的「模型入口」。
 * 测试注入 mock（返回预设 LLMResponse），run.ts 注入真 Anthropic 实现。
 * exercise 永远依赖这个接口，不直接 import SDK → 测试不烧 token。
 */
export interface LLM {
  chat(messages: Message[], opts?: { tools?: Tool[]; maxTokens?: number }): Promise<LLMResponse>;
}
