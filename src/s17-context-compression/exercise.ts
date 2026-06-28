/**
 * 入口管理做得再好，Agent 跑 50 轮上下文大概率还是会爆。压缩不是「要不要」是「怎么做」。
 * 核心原则：从轻到重，能不丢信息就不丢。三级渐进（学 Claude Code）：
 *   ① Microcompact —— 缩小老的 tool 结果（换成占位符），结构不动、可恢复（最轻）
 *   ② Snip        —— 从最老开始整条删消息，保留最近窗口，不可逆（中）
 *   ③ Auto-compact —— 调 LLM 把更老的对话摘要成一条，信息损失最大（最重）
 * 来源：materials/raw/16-context-compression.txt §"Claude Code 三层渐进式降级" / §"Compaction vs Summarization"
 */

/** 一条对话消息。role=tool 的是工具结果——压缩的大头。 */
export interface CMsg {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
}

/** 老 tool 结果被 Microcompact 后替换成的占位符（可逆：原文存进 recovered）。 */
export const CLEARED = "[Old tool result content cleared]";

export interface CompressOpts {
  /** token 预算：估算总 token 超过它才触发压缩。 */
  budget: number;
  /** 最近多少条消息永不动（它们大概率还在被引用）。 */
  recentKeep: number;
  /** 注入的「LLM 摘要」函数（测试用 mock，真实是一次 LLM 调用）。 */
  summarize: (msgs: CMsg[]) => string;
}

export interface CompressResult {
  messages: CMsg[];
  /** Microcompact 清掉的 tool 结果原文：id → 原始内容，需要时可读回（可恢复）。 */
  recovered: Record<string, string>;
  /** 是否动用了第三级 LLM 摘要。 */
  summarized: boolean;
}

/** 已就位：粗略 token 估算（4 字符 ≈ 1 token）。 */
export function estTokens(msgs: CMsg[]): number {
  return msgs.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0);
}

/**
 * 按 token 预算分三级压缩，越轻的手段越先用，够了就停。
 */
export function compress(messages: CMsg[], opts: CompressOpts): CompressResult {
  // TODO: stage s17 —— ~22 行
  // 0. recovered = {}; work = messages.slice(); fits = () => estTokens(work) <= budget
  //    没超预算直接原样返回（summarized:false）
  // 1. 【Microcompact】oldCount = max(0, work.length - recentKeep)
  //    遍历前 oldCount 条：若 role==='tool' 且 content !== CLEARED →
  //      recovered[id] = 原content；把这条 content 换成 CLEARED（可逆）
  //    fits() ? 返回 {work, recovered, summarized:false}
  // 2. 【Snip】while work.length > recentKeep 且 !fits()：work.shift()（删最老一条）
  //    fits() ? 返回 {work, recovered, summarized:false}
  // 3. 【Auto-compact】连最近窗口都超预算：把除最后 1 条外的都摘要成 1 条
  //    若 work.length > 1：head = work.slice(0,-1)；
  //      work = [{id:'summary', role:'assistant', content: summarize(head)}, 最后一条]
  //    返回 {work, recovered, summarized:true}
  let recovered: Record<string, string> = {};
  let work: CMsg[] = messages.slice();
  const fits = () => estTokens(work) <= opts.budget;
  if (fits()) {
    return { messages: work, recovered, summarized: false };
  }
  const oldCount = Math.max(0, work.length - opts.recentKeep);
  for (let i = 0; i < oldCount; i++) {
    const msg = work[i];
    if (msg && msg.role === "tool" && msg.content !== CLEARED) {
      recovered[msg.id] = msg.content;
      msg.content = CLEARED;
    }
  }
  if (fits()) {
    return { messages: work, recovered, summarized: false };
  }
  while (work.length > opts.recentKeep && !fits()) {
    work.shift();
  }
  if (fits()) {
    return { messages: work, recovered, summarized: false };
  }
  if (work.length > 1) {
    const head = work.slice(0, -1);
    work = [
      { id: "summary", role: "assistant", content: opts.summarize(head) },
      work[work.length - 1],
    ];
  }
  return { messages: work, recovered, summarized: true };
}
