import type { LLM, Message, ToolCall, ToolResult } from "../_shared/types.js";

/**
 * 最小 ReAct 循环：think → act → observe，直到模型不再调用工具。
 * 这是整门课的地基——后面 m02~m06 的 loop 都长在它身上。
 *
 * @param messages 初始对话（通常含一条 user 任务）。函数可原地 push。
 * @param llm 注入的模型（测试给 mock，run.ts 给真 Anthropic）
 * @param execute 执行一次工具调用拿结果（具体工具由调用方提供，loop 不关心是什么工具）
 * @returns 跑完后的完整 messages（含每轮 assistant 文字 + 每次 tool 结果）
 */
export async function runLoop(
  messages: Message[],
  llm: LLM,
  execute: (call: ToolCall) => Promise<ToolResult>,
): Promise<Message[]> {
  // TODO: stage s03 —— 手搓 while(true) 循环（10~15 行）
  // 1. while (true) {
  // 2.   const res = await llm.chat(messages)              // 想：让模型决定下一步
  // 3.   messages.push({ role: "assistant", content: res.text, toolCalls: res.toolCalls })
  // 4.   if (res.toolCalls.length === 0) break             // 模型没调工具 = 任务完成，停（开放式：步数不预设）
  // 5.   for (const call of res.toolCalls) {               // 做：逐个执行工具
  // 6.     const result = await execute(call)
  // 7.     messages.push({ role: "tool", content: result.content, toolCallId: result.toolCallId })  // 看：结果喂回去
  // 8.   }
  // 9. }
  // 10. return messages
  throw new Error("TODO: stage s03 —— 实现 runLoop");
}
