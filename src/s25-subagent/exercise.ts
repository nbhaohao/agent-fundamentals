/**
 * 拆 Agent 不是为了「分角色」，是为了分上下文。
 * 父子模式：父 Agent 派一个子 Agent 出去，子 Agent 在**自己独立、干净的上下文窗口**里
 * 探索（读几十个文件、消耗几万 token），干完只把一段压缩后的结论回传给父。
 * Manus 公开的数据：子 Agent 探索消耗几万 token，回传摘要只有 1-2K token —— 10~20 倍压缩比。
 * 这些 token 不是被浪费，它们完成了使命（搜索/阅读/判断），只把结论传回来。
 *
 * 本关手搓这个机制的最小内核，断言两件事：
 *   ① 父上下文不被污染 —— 子读过的原文一个字都不进父上下文，父只多了一条摘要。
 *   ② 子上下文是隔离的 —— 子在全新上下文里跑，父再大也不影响子消耗（隔离是默认的）。
 * 本关只做父子单向委派；双向通信 / 共享任务列表 / 权限代理是下一关 Swarm。
 * 来源：materials/raw/25-context-splitting.txt §"父子模式" / §"Multi-Agent 的本质是上下文管理策略"
 */

import type { LLM, Message } from "../_shared/llm.js";

/** 子 Agent 的系统提示：它在自己干净的上下文里干活，最后用一段话汇报结论。 */
export const SUBAGENT_SYS = "你是子 Agent，在独立上下文里完成任务后用一段话汇报结论";

export interface DelegateResult {
  /** 派完活之后的父上下文：只比原来多了「一条摘要」，不含任何子读过的原文。 */
  parent: Message[];
  /** 子 Agent 自己上下文消耗的总字符数（= 探索成本，会很大）。 */
  childChars: number;
}

/**
 * 父 Agent 派一个子 Agent 去读 docs、把结论压缩回传。
 * 子在**全新干净**的上下文里跑（不是 parent 的副本），父上下文最后只追加那条摘要。
 */
export async function spawnSubAgent(
  parent: Message[],
  task: string,
  docs: string[],
  llm: LLM,
): Promise<DelegateResult> {
  // TODO: stage s25 —— ~8 行
  // 1. 子 Agent 开一份**全新干净**的上下文 child = [{system: SUBAGENT_SYS}, {user: task}]
  //    —— 注意：不是 parent 的副本！子和父隔离（隔离是默认的、共享是可选的）。
  // 2. 子在自己上下文里逐篇读 docs：for doc of docs → child.push({role:'user', content: doc})
  //    （模拟读几十个文件，token 全堆在子这边、不进父）
  // 3. childChars = 子所有消息 content 的总字符数（探索成本，会很大）
  // 4. summary = (await llm.chat(child)).text —— 把整个子上下文压成一段结论摘要
  // 5. return { parent: 父上下文末尾只追加一条 {role:'user', content: summary}, childChars }
  //    —— 不能把 docs 原文加进父！父只看到那条摘要。
  throw new Error("TODO: stage s25");
}
