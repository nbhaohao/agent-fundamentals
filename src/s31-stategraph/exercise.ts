/**
 * LangGraph 实战：用图的方式重新理解 Agent Loop。
 *
 * 你前面手写过完整的 while(true) Agent Loop。这一关换个视角：LangGraph 把同一个循环
 * 表达成一张「图」——核心就三样东西（源课 Step 2）：
 *   · State：图的全局状态，每个 channel 配一个 reducer（messages 追加 / turnCount 覆盖）。
 *   · Node：一个函数，拿完整 state → 返回「局部更新」（只含改了的 channel），reducer 负责合并。
 *   · Edge：固定边（A 跑完无条件去 B）或条件边（路由函数看 state 决定下一站，或 END）。
 *
 * builder（graph.ts，已就位）把这些记成纯数据 CompiledGraph。本关你写的是**执行器**——
 * 也就是 LangGraph `compile()` 之后 `graph.invoke()` 背后那个循环。写完你会看清源课那句话：
 *   「同样的逻辑，一个用显式 while 循环，一个用图——图 = while-loop + 声明式 reducer/路由。」
 * 对简单 ReAct 循环，while(true) 其实更清晰；图的价值在复杂分支 + checkpoint/interrupt（本关不做，概念课讲）。
 *
 * 断言三件事：
 *   ① reducer 合并：节点只返回局部更新，执行器按 channel 的 reducer 合并（messages 追加、turnCount 覆盖）。
 *   ② 条件边 + 固定边 + END：agent 有 toolCall → 走 tools；tools 固定回 agent；无 toolCall → END。
 *   ③ turnCount 保险丝：路由函数里判 turnCount >= MAX 就 END，图在有界轮次内停（不是靠 maxSteps 兜底）。
 * 来源：materials/raw/31-langgraph.txt §"Step 2：手搓 StateGraph" / §"Step 4：加上保险丝" / §"用六大支柱透视 LangGraph"
 */

import { type CompiledGraph, END } from "./graph.js";

/**
 * 执行一张已编译的图：从入口节点起，跑节点 → reducer 合并局部更新 → 查出边定下一站，遇 END 停。
 *
 * @param graph    compile() 出来的纯数据图
 * @param input    初始输入（也当成一次局部更新，经 reducer 并入初始 state）
 * @param maxSteps 防失控上限：图里有环又不收敛时兜底（正常应在 END 前退出）
 * @returns        跑到 END 时的最终 state
 */
export async function runGraph<S extends Record<string, any>>(
  graph: CompiledGraph<S>,
  input: Partial<S>,
  maxSteps = 50,
): Promise<S> {
  const state: S = {} as S;
  for (const k in graph.channels) {
    (state as Record<string, any>)[k] = graph.channels[k].default();
  }
  const merge = (update: Partial<S>) => {
    for (const k in update) {
      state[k] = graph.channels[k].reducer(state[k], update[k]);
    }
  };
  merge(input);
  let current = graph.entry;
  let step = 0;
  while (step < maxSteps) {
    if (current === END) return state;
    const node = graph.nodes[current];
    const update = await node(state);
    merge(update);
    const edge = graph.edges[current];
    if (typeof edge === "function") current = edge(state);
    else if (typeof edge === "string") current = edge;
    else current = END;
    step++;
  }
  throw new Error("Graph has a cycle and did not converge within maxSteps");
}
