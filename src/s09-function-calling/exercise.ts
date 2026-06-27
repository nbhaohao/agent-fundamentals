/**
 * Function Calling 的真相：模型只是「输出一段符合 Schema 的 JSON」，执行是你做的。
 * 约束解码能保证「格式」100% 合法，但保证不了「语义」——值可能是幻觉。
 * 所以参数校验是工具系统第一道防线。
 * 来源：materials/raw/08-function-calling.txt §"约束解码只保证格式，不保证语义" / §"模型会幻觉出不存在的参数"
 */

/** 单个参数的 schema。enum 锚定原文「用 enum 约束可选值，模型编不出第四个」。 */
export interface ParamSchema {
  type: "string" | "number" | "boolean";
  required?: boolean;
  enum?: (string | number)[];
}

/** 一个工具的参数表：字段名 → 规则。生产用 Zod，这里手搓最小版理解原理。 */
export type ToolSchema = Record<string, ParamSchema>;

export interface ValidationResult {
  ok: boolean;
  /** 清晰的错误信息——是给「模型」看的，要能让它自我纠正（原文：不是 "validation failed"）。 */
  errors: string[];
}

/**
 * 校验模型生成的 toolCall 参数是否符合 schema。
 * 锚定原文三件事：① 格式校验（type）② enum 约束 ③ 清晰错误反馈。
 */
export function validateToolCall(
  schema: ToolSchema,
  args: Record<string, unknown>,
): ValidationResult {
  // TODO: stage s09 —— ~12 行
  // 1. const errors: string[] = []
  // 2. 遍历 schema 每个 [field, rule]：
  // 3.   val = args[field]；缺失(undefined/null)时：rule.required → push「缺少必填参数」，否则跳过
  // 4.   typeof val !== rule.type → push「应为 X 收到了 Y」（错误信息要清晰，给模型看）
  // 5.   rule.enum 存在且 val 不在 enum 里 → push「必须是 [...] 之一」
  // 6. return { ok: errors.length === 0, errors }
  throw new Error("TODO: stage s09 —— 实现 validateToolCall");
}
