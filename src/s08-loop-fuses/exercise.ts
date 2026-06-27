import { createHash } from "node:crypto";
import type { LLM, Message, ToolCall, ToolResult } from "../_shared/types.js";

/**
 * 把工具名 + 参数哈希成 12 字符指纹，用于判断是否重复调用同一工具。
 * 稳定序列化（来源：07-loop-fuses.txt §"核心思路：给每次调用打指纹"）：
 *   JavaScript 对象 key 顺序不确定，先排序再 stringify，
 *   保证 {a:1,b:2} 和 {b:2,a:1} 产出同一指纹。
 */
export function fingerprint(
  name: string,
  args: Record<string, unknown>,
): string {
  const stable = JSON.stringify(args, Object.keys(args).sort());
  return createHash("sha256")
    .update(name + stable)
    .digest("hex")
    .slice(0, 12);
}

/** 一个工具调用指纹的历史记录 */
export interface LoopEntry {
  count: number; // 连续同结果重复次数
  lastResult: string; // 上一次工具结果
}

/**
 * 检查一次工具调用是否构成无进展重复。
 *
 * 核心判断（来源原文）：
 *   同调用(fingerprint) + 同结果 = 无进展 → count++
 *   结果变了（有新信息）= 有进展 → count 重置为 1
 *
 * 三级响应（对应 OpenClaw 的 Warning/Critical/Break）：
 *   count >= breakAt → 'break'（强制停止）
 *   count >= warnAt  → 'warn'（注入干预消息，让模型换策略）
 *   otherwise        → 'ok'
 *
 * @param history  调用历史 Map（由外层 loop 维护，跨轮次共享）
 */
export function checkLoop(
  name: string,
  args: Record<string, unknown>,
  result: string,
  history: Map<string, LoopEntry>,
  warnAt = 5,
  breakAt = 10,
): "ok" | "warn" | "break" {
  const fp = fingerprint(name, args);
  const entry = history.get(fp) ?? { count: 0, lastResult: "" };
  if (entry.lastResult === result) entry.count++;
  else entry.count = 1; // 结果变了，重新计数（有进展）
  entry.lastResult = result;
  history.set(fp, entry);
  if (entry.count >= breakAt) return "break";
  if (entry.count >= warnAt) return "warn";
  return "ok";
}

/** Loop 被保险丝强制中断时抛出 */
export class LoopFuseError extends Error {
  constructor(public readonly reason: "max_turns" | "dead_loop") {
    super("Loop fuse triggered: " + reason);
    this.name = "LoopFuseError";
  }
}

/**
 * 带保险丝的 agent loop：在 s03 runLoop 基础上加两道保险。
 *
 * 保险丝 A：max_turns —— 超出最大轮数抛出 LoopFuseError('max_turns')
 * 保险丝 B：死循环检测 ——
 *   checkLoop 返回 'warn'  → 注入系统消息提醒模型换策略（不停止，给模型自救机会）
 *   checkLoop 返回 'break' → 抛出 LoopFuseError('dead_loop')
 *
 * 来源：07-loop-fuses.txt §"三级响应：不是一上来就断"
 */
export async function guardedLoop(
  messages: Message[],
  llm: LLM,
  execute: (call: ToolCall) => Promise<ToolResult>,
  maxTurns = 20,
): Promise<Message[]> {
  const history = new Map<string, LoopEntry>();
  let turns = 0;
  while (true) {
    turns++;
    if (turns > maxTurns) throw new LoopFuseError("max_turns");
    const res = await llm.chat(messages);
    messages.push({
      role: "assistant",
      content: res.text,
      toolCalls: res.toolCalls,
    });
    if (res.toolCalls.length === 0) break;
    for (const call of res.toolCalls) {
      const result = await execute(call);
      messages.push({
        role: "tool",
        content: result.content,
        toolCallId: result.toolCallId,
      });
      const status = checkLoop(call.name, call.args, result.content, history);
      if (status === "break") throw new LoopFuseError("dead_loop");
      if (status === "warn")
        messages.push({
          role: "system",
          content: "[LOOP_WARNING] 你在重复操作且无进展，请换一种方式。",
        });
    }
  }
  return messages;
}
