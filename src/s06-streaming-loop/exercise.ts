import type { LLM, Message, ToolCall, ToolResult } from "../_shared/types.js";

// 已就位（AI 生成）—— 共享事件类型，本关 streamLoop 产出这四种事件。
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; id: string; name: string }
  | { type: "tool_end"; id: string; name: string; result: string }
  | { type: "done" };

/**
 * 判断工具名是否只读安全（可并发运行）。
 * 约定（来源：05-streaming-architecture.txt §"但不是所有工具都能边说边执行"）：
 *   name 包含 read / search / list / get 之一 = 只读，可并发；
 *   其余视为写操作，必须串行。
 */
export function isReadOnly(toolName: string): boolean {
  // TODO: stage s06 —— 一行
  // ['read', 'search', 'list', 'get'].some(kw => toolName.toLowerCase().includes(kw))
  throw new Error("TODO: stage s06 —— 实现 isReadOnly");
}

/**
 * 流式 Agent Loop（async generator）。
 * 每轮 LLM 响应后产出事件流：
 *   { type:'text' }       —— 模型文字（yield 后可立刻展示给用户）
 *   { type:'tool_start' } —— 某工具开始执行
 *   { type:'tool_end' }   —— 某工具执行完毕
 *   { type:'done' }       —— 无更多工具调用，loop 正常结束
 *
 * 并发安全规则（来源原文）：
 *   只读工具 → Promise.all 并发：先 yield 全部 tool_start，再 await 结果，再按序 yield tool_end
 *   写工具   → 严格串行：每个 tool_start → await execute → tool_end，再下一个
 */
export async function* streamLoop(
  messages: Message[],
  llm: LLM,
  execute: (call: ToolCall) => Promise<ToolResult>,
): AsyncGenerator<StreamEvent> {
  // TODO: stage s06 —— 实现流式 loop（~25 行）
  // 1. while (true) {
  // 2.   const res = await llm.chat(messages)
  // 3.   yield { type: 'text', text: res.text }
  // 4.   if (res.toolCalls.length === 0) { yield { type: 'done' }; return }
  // 5.   messages.push({ role: 'assistant', content: res.text, toolCalls: res.toolCalls })
  // 6.   const reads = res.toolCalls.filter(c => isReadOnly(c.name))
  // 7.   const writes = res.toolCalls.filter(c => !isReadOnly(c.name))
  // 8.   // 只读并发：先 yield start × N，await Promise.all，再按序 yield end + push result
  // 9.   for (const c of reads) yield { type: 'tool_start', id: c.id, name: c.name }
  // 10.  const readResults = await Promise.all(reads.map(c => execute(c)))
  // 11.  for (let i = 0; i < reads.length; i++) {
  // 12.    yield { type: 'tool_end', id: reads[i].id, name: reads[i].name, result: readResults[i].content }
  // 13.    messages.push({ role: 'tool', content: readResults[i].content, toolCallId: readResults[i].toolCallId })
  // 14.  }
  // 15.  // 写操作串行
  // 16.  for (const c of writes) {
  // 17.    yield { type: 'tool_start', id: c.id, name: c.name }
  // 18.    const r = await execute(c)
  // 19.    yield { type: 'tool_end', id: c.id, name: c.name, result: r.content }
  // 20.    messages.push({ role: 'tool', content: r.content, toolCallId: r.toolCallId })
  // 21.  }
  // 22. }
  throw new Error("TODO: stage s06 —— 实现 streamLoop");
}
