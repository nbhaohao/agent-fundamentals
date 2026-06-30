// pnpm v:s31 —— 纯本地演示，不需要 key。用 mock 模型驱动一张图：agent→tools→agent→END，
// 看「节点只返回局部更新、reducer 合并、条件边/固定边路由」整圈跑下来。先实现 exercise.ts 再跑。
import { banner } from "../_shared/cli.js";
import { runGraph } from "./exercise.js";
import { StateGraph, START, END, type Channel } from "./graph.js";

banner("s31 · 手搓 StateGraph 执行引擎（图 = while-loop + 声明式 reducer/路由）");

type Msg = { role: string; content: string; toolCalls?: { name: string; args: any; id: string }[] };
type S = { messages: Msg[]; turnCount: number };

const channels: Record<string, Channel> = {
  messages: { reducer: (c: Msg[], u: Msg[]) => [...c, ...u], default: () => [] as Msg[] },
  turnCount: { reducer: (_: number, u: number) => u, default: () => 0 },
};

// mock 模型：第 1 次想调 search，第 2 次直接收尾。真课里这是 model.invoke(state.messages)。
let calls = 0;
const callModel = (s: S): Partial<S> => {
  calls++;
  const msg: Msg = calls === 1
    ? { role: "assistant", content: "", toolCalls: [{ name: "search", args: { query: "LangGraph" }, id: "c1" }] }
    : { role: "assistant", content: "LangGraph 用 StateGraph 把 Agent Loop 表达成图。" };
  console.log(`  🧠 agent  → ${msg.toolCalls?.length ? `调用 ${msg.toolCalls[0].name}` : `收尾：${msg.content}`}`);
  return { messages: [msg], turnCount: s.turnCount + 1 };
};

const callTools = (s: S): Partial<S> => {
  const calls = s.messages.at(-1)?.toolCalls ?? [];
  const results = calls.map((tc) => {
    console.log(`  🔧 tools  → 执行 ${tc.name}(${JSON.stringify(tc.args)})`);
    return { role: "tool", content: "LangGraph 是 LangChain 的图编排框架，核心是 StateGraph。", id: tc.id } as Msg;
  });
  return { messages: results };
};

const MAX_TURNS = 5;
const shouldContinue = (s: S): string => {
  if (s.turnCount >= MAX_TURNS) return END;
  return s.messages.at(-1)?.toolCalls?.length ? "tools" : END;
};

const graph = new StateGraph<S>(channels)
  .addNode("agent", callModel)
  .addNode("tools", callTools)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent")
  .compile();

const out = await runGraph(graph, { messages: [{ role: "user", content: "搜索 LangGraph 再总结一句" }] });

console.log(`\n  最终状态：turnCount=${out.turnCount}，messages 顺序 = [${out.messages.map((m) => m.role).join(", ")}]`);
console.log(`  最终回复：${out.messages.at(-1)?.content}`);
banner("同样的逻辑 while(true) 也能写——图只是把 reducer/路由声明在了一处");
