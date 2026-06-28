/**
 * System Prompt 不是一段手写的话，是一个「行为控制系统」。
 * 第一个工程问题是模块化：把 prompt 拆成独立 section，每个 section 是一个函数（Pipe）——
 * 拿到运行时上下文，自己判断要不要输出。要就返回一段字符串，不需要就返回 null。
 * 没用的 section 返回 null 自动消失 = 「入口管理」，这是对抗 Context Rot 的第一性原理。
 * 来源：materials/raw/15-system-prompt.txt §"Prompt Pipe 模式" / §"控制入口，减少不必要的上下文消耗"
 */

/** 运行时上下文：每个 Pipe 都能拿到，据此判断输出什么 / 要不要输出。 */
export interface PromptContext {
  /** 用户自定义记忆（CLAUDE.md 之类）。 */
  memories?: string[];
  /** 搜索工具是否可用——false 时要提醒模型别尝试搜索。 */
  webSearchEnabled?: boolean;
  /** 当前工作目录（动态信息，变化频繁）。 */
  cwd?: string;
}

/** 一个 Pipe = 一个函数：拿到上下文，返回 prompt 片段，或 null（这段不出现）。 */
export type PromptPipe = (ctx: PromptContext) => string | null;

/**
 * 把多个 Pipe 串起来组装成最终 system prompt。
 * 顺序 = 传入顺序（调用方负责「静态在前、动态在后」以利缓存）。
 * 返回 null / 空串的 Pipe 被丢弃，其余用空行拼接。
 */
export function buildPrompt(pipes: PromptPipe[], ctx: PromptContext): string {
  // TODO: stage s16 —— ~5 行
  // 1. 对每个 pipe 调用 pipe(ctx) 拿到片段
  // 2. 过滤掉 null 和空串（trim 后为空也算空）——这就是「没用的 section 自动消失」
  // 3. 用 '\n\n'（空行）把剩下的片段拼成一个字符串返回
  throw new Error("TODO: stage s16 —— 实现 buildPrompt");
}
