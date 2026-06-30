// 已就位（AI 生成）—— 最小 StateGraph builder + 常量。
//
// 这是 LangGraph 的「图」抽象拆到最小：状态（State，每个 channel 配一个 reducer）、
// 节点（Node，拿完整 state 返回局部更新）、边（Edge，固定字符串 or 条件路由函数）。
// builder 只把这些记成一坨纯数据 CompiledGraph，**不含执行逻辑**——
// 执行器 runGraph 是本关学员要写的核心（见 exercise.ts），那才是「graph.invoke() 背后的循环」。
//
// 对照源课 Step 2：StateGraph().addNode().addEdge().addConditionalEdges().compile()。
// 我们把 addConditionalEdges 的「路由映射表」化简掉——路由函数直接返回下一个节点名（或 END），
// 因为源课的映射就是恒等映射（shouldContinue 返回 "tools" / END 本身就是节点名）。

export const START = "__start__";
export const END = "__end__";

/** 节点函数：拿当前完整 state → 返回「局部更新」（只含改了的 channel），由 reducer 合并进 state。 */
export type NodeFn<S> = (state: S) => Partial<S> | Promise<Partial<S>>;

/** 路由函数（条件边）：看 state 决定下一个节点名，或返回 END 结束。 */
export type Router<S> = (state: S) => string;

/** 一个 channel 的合并规则：(当前值, 局部更新值) → 新值。messages 用追加、turnCount 用覆盖。 */
export type Reducer = (current: any, update: any) => any;

/** 一个 channel 的定义：reducer + 初始值。 */
export interface Channel {
  reducer: Reducer;
  default: () => any;
}

/** compile() 的产物：一坨纯数据，runGraph 照它执行。 */
export interface CompiledGraph<S> {
  nodes: Record<string, NodeFn<S>>;
  /** 每个源节点一条出边：固定目标名（string）或条件路由函数。没登记 = 走到 END。 */
  edges: Record<string, string | Router<S>>;
  channels: Record<string, Channel>;
  /** START 指向的第一个节点。 */
  entry: string;
}

/** 链式 builder：addNode / addEdge / addConditionalEdges / compile → CompiledGraph。 */
export class StateGraph<S> {
  private nodes: Record<string, NodeFn<S>> = {};
  private edges: Record<string, string | Router<S>> = {};
  private entry = "";

  constructor(private channels: Record<string, Channel>) {}

  addNode(name: string, fn: NodeFn<S>): this {
    this.nodes[name] = fn;
    return this;
  }

  /** 固定边：from 跑完无条件走 to。from === START 时记成入口。 */
  addEdge(from: string, to: string): this {
    if (from === START) this.entry = to;
    else this.edges[from] = to;
    return this;
  }

  /** 条件边：from 跑完，由 router(state) 决定下一站（返回节点名或 END）。 */
  addConditionalEdges(from: string, router: Router<S>): this {
    this.edges[from] = router;
    return this;
  }

  compile(): CompiledGraph<S> {
    return {
      nodes: this.nodes,
      edges: this.edges,
      channels: this.channels,
      entry: this.entry,
    };
  }
}
