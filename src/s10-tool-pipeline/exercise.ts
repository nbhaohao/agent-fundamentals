/**
 * 工具执行管线：从「模型表达意图」到「真正执行」中间的过滤链。
 * 原文是 7 步（Zod 校验 → 业务校验 → 输入补全 → PreHook → 权限 → 执行+截断 → PostHook），
 * 这里收敛成可落地的 4 段：① 格式校验（复用 s09）② 权限 ③ 执行 ④ 结果截断回填。
 * 贯穿全程的铁律：任何一步失败都不抛异常，而是把「清晰错误」写进 ToolResult 回填给模型。
 * 来源：materials/raw/09-tool-pipeline.txt §"一条管线的全貌" / §"错误信息是给模型看的"
 */
import type { ToolCall, ToolResult } from "../_shared/types.js";
import { validateToolCall, type ToolSchema } from "../s09-function-calling/exercise.js";

export type Permission = "allow" | "deny";

export interface PipelineTool {
  schema: ToolSchema;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

export interface DispatchOpts {
  /** 权限检查（第五步）。不传 = 一律放行。 */
  checkPermission?: (name: string, args: Record<string, unknown>) => Permission;
  /** 结果截断阈值（原文默认 50000 字符）。 */
  maxResultChars?: number;
}

/**
 * 派发一次工具调用，走完整管线。永远返回 ToolResult（错误也是 content），不抛异常。
 */
export async function dispatchTool(
  call: ToolCall,
  registry: Record<string, PipelineTool>,
  opts: DispatchOpts = {},
): Promise<ToolResult> {
  // TODO: stage s10 —— ~18 行（依赖 s09 的 validateToolCall）
  // 0.  小工具：err(msg) = { toolCallId: call.id, content: `[错误] ${msg}` }（错误也走 content 回填，不抛）
  // 1.  tool = registry[call.name]；不存在 → return err(未知工具)
  // 2.  校验：v = validateToolCall(tool.schema, call.args)；!v.ok → return err(含 v.errors)
  // 3.  权限：perm = opts.checkPermission?.(name,args) ?? 'allow'；'deny' → return err(权限拒绝)
  // 4.  执行：try { out = await tool.execute(call.args) } catch → return err(执行失败 + e.message)
  // 5.  截断：max = opts.maxResultChars ?? 50000；out.length > max → out = out.slice(0,max) + 截断提示
  // 6.  return { toolCallId: call.id, content: out }
  throw new Error("TODO: stage s10 —— 实现 dispatchTool");
}
