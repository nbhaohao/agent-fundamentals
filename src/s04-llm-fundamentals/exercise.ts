import type { Message } from "../_shared/types.js";

/**
 * KV Cache 的本质：模型逐 token 自回归生成，但「相同前缀」那部分的注意力计算可以复用。
 * 这里用「两段对话共享多长的前缀」给 cache 边界建个最小模型——
 * 关键直觉：改动越靠前的 message，被废掉的 cache 越多（前缀一断，后面全部失效）。
 *
 * @returns 从第 0 条开始、连续完全相同的 message 条数（role 与 content 都相同才算相同）
 */
export function sharedPrefixLen(a: Message[], b: Message[]): number {
  // TODO: stage s04 —— 求最长公共前缀长度（5~8 行）
  // 1. let i = 0
  // 2. while (i < a.length && i < b.length) {
  // 3.   if (a[i].role !== b[i].role || a[i].content !== b[i].content) break  // 前缀一断就停
  // 4.   i++
  // 5. }
  // 6. return i
  throw new Error("TODO: stage s04 —— 实现 sharedPrefixLen");
}
