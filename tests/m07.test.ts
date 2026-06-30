import { describe, it, expect } from "vitest";
import { runGraph } from "../src/s31-stategraph/exercise.js";
import { StateGraph, START, END, type Channel } from "../src/s31-stategraph/graph.js";

// 一条消息（够本关用：role + content，agent 可能带 toolCalls）。不调真 LLM，节点都是普通函数。
type Msg = { role: string; content: string; toolCalls?: { name: string; args: any; id: string }[] };
type S = { messages: Msg[]; turnCount: number };

// channels：messages 追加、turnCount 覆盖（对照源课 Step 2/4 的两种 reducer）。
const channels: Record<string, Channel> = {
  messages: { reducer: (c: Msg[], u: Msg[]) => [...c, ...u], default: () => [] as Msg[] },
  turnCount: { reducer: (_: number, u: number) => u, default: () => 0 },
};

const MAX_TURNS = 5;
// 路由函数：到上限就 END（保险丝）；否则有 toolCall 去 tools、没有就 END。
const shouldContinue = (s: S): string => {
  if (s.turnCount >= MAX_TURNS) return END;
  return s.messages.at(-1)?.toolCalls?.length ? "tools" : END;
};
// tools 节点：执行上一条 agent 消息里的 toolCalls，回填 tool 消息。
const callTools = (s: S): Partial<S> => {
  const calls = s.messages.at(-1)?.toolCalls ?? [];
  return { messages: calls.map((tc) => ({ role: "tool", content: `result of ${tc.name}`, id: tc.id } as Msg)) };
};

describe("stage 1 · s31 StateGraph 执行引擎：reducer 合并 / 条件边+固定边+END / turnCount 保险丝", () => {
  it("reducer 合并：节点只返回局部更新，messages 追加、turnCount 覆盖", async () => {
    const graph = new StateGraph<S>(channels)
      .addNode("agent", (s: S) => ({ messages: [{ role: "assistant", content: "hi" }], turnCount: s.turnCount + 1 }))
      .addEdge(START, "agent")
      .addConditionalEdges("agent", () => END)
      .compile();

    const out = await runGraph(graph, { messages: [{ role: "user", content: "q" }], turnCount: 0 });
    expect(out.messages.map((m) => m.content)).toEqual(["q", "hi"]); // 追加，不是覆盖
    expect(out.turnCount).toBe(1); // 覆盖：default 0 → 节点返回 0+1
  });

  it("条件边走 tools、固定边回 agent、无 toolCall 时 END：完整 ReAct 一圈", async () => {
    let calls = 0;
    const callModel = (s: S): Partial<S> => {
      calls++;
      const msg: Msg = calls === 1
        ? { role: "assistant", content: "", toolCalls: [{ name: "search", args: { q: "LangGraph" }, id: "c1" }] }
        : { role: "assistant", content: "done" };
      return { messages: [msg], turnCount: s.turnCount + 1 };
    };
    const graph = new StateGraph<S>(channels)
      .addNode("agent", callModel)
      .addNode("tools", callTools)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", shouldContinue)
      .addEdge("tools", "agent")
      .compile();

    const out = await runGraph(graph, { messages: [{ role: "user", content: "hi" }] });
    expect(out.messages.map((m) => m.role)).toEqual(["user", "assistant", "tool", "assistant"]);
    expect(out.turnCount).toBe(2);
    expect(out.messages.at(-1)?.toolCalls).toBeUndefined(); // 最后一稿无工具调用 → 才走的 END
  });

  it("turnCount 保险丝：模型一直想调工具，图在 MAX_TURNS 轮停（靠路由判断、不是 maxSteps 兜底抛错）", async () => {
    const alwaysTool = (s: S): Partial<S> => ({
      messages: [{ role: "assistant", content: "", toolCalls: [{ name: "search", args: {}, id: "x" }] }],
      turnCount: s.turnCount + 1,
    });
    const graph = new StateGraph<S>(channels)
      .addNode("agent", alwaysTool)
      .addNode("tools", callTools)
      .addEdge(START, "agent")
      .addConditionalEdges("agent", shouldContinue)
      .addEdge("tools", "agent")
      .compile();

    const out = await runGraph(graph, { messages: [{ role: "user", content: "go" }] }, 50);
    expect(out.turnCount).toBe(MAX_TURNS); // 到点停，没有跑到 maxSteps 抛错
  });
});
