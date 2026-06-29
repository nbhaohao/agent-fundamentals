/**
 * ACP（Agent Client Protocol）：Agent 世界的 LSP —— 标准化「任何客户端」和「任何 Agent」之间的通信。
 *
 * 问题：每多一个客户端（Zed、JetBrains、Telegram、Web）就多写一份适配层，消息格式 / 权限 / 流式各不一样，
 *   N 个客户端 × M 个 Agent = N×M 份集成。十年前 LSP 把编辑器×语言从 N×M 降到 N+M，ACP 对 Agent 做同一件事：
 *   写一次 Agent，所有支持 ACP 的客户端都能接。
 * 传输层跟 MCP 一样：客户端把 Agent 拉起为子进程，stdin 发 / stdout 收，消息格式是 **JSON-RPC 2.0**（每条一行）。
 * 最小 ACP Agent 的骨架就三个方法：initialize（握手，声明 capabilities）、newSession（建会话，返回 sessionId）、
 *   prompt（干活，流式推 sessionUpdate、敏感操作发 requestPermission）。
 *
 * 本关手搓「控制接口」最小内核 —— 一个 JSON-RPC 路由器，把进来的请求按 method 派到 agent 的对应方法，
 *   并裹上标准 JSON-RPC 2.0 信封。断言三件事：
 *   ① 三个方法各自路由到 agent.initialize / newSession / prompt，结果裹进 { jsonrpc, id, result }、id 原样回显。
 *   ② 未知 method → 返回 error 信封，code = -32601（JSON-RPC 标准的 Method not found），不含 result。
 *   ③ 出错也带上请求的 id（客户端靠 id 把响应对回它的请求）。
 * 本关只做同步路由 + 信封；流式 sessionUpdate / requestPermission 回环 / capability 协商 / A2A 是协议全貌，作为概念讲。
 * 来源：materials/raw/30-acp.txt §"一次完整的 ACP 交互" / §"实际接入：没你想的那么重"
 */

/** JSON-RPC 2.0 请求：id 用来把响应对回请求，method 是要调的方法名，params 是参数。 */
export interface RpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: any;
}

/** JSON-RPC 2.0 响应：result 和 error 二选一，id 必须回显请求的 id。 */
export interface RpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: { code: number; message: string };
}

/** 一个最小 ACP Agent 要实现的三个方法（同步版，真实现里是 async + 流式）。 */
export interface AcpAgent {
  initialize(params: any): any;
  newSession(params: any): any;
  prompt(params: any): any;
}

/**
 * 处理一条 JSON-RPC 请求：按 method 派给 agent 的对应方法，裹上 JSON-RPC 2.0 信封返回。
 */
export function handleRpc(req: RpcRequest, agent: AcpAgent): RpcResponse {
  // TODO: stage s30 —— ~8 行
  // 1. 建一张 method → handler 的表：
  //      initialize → agent.initialize, newSession → agent.newSession, prompt → agent.prompt
  //    （注意 this：可用箭头 (p) => agent.initialize(p) 包一层，别丢了 agent 上下文。）
  // 2. h = 表[req.method]。
  // 3. 没有 h（未知方法）→ return { jsonrpc:"2.0", id:req.id,
  //      error:{ code:-32601, message:`Method not found: ${req.method}` } } —— 注意也带 id。
  // 4. 有 h → return { jsonrpc:"2.0", id:req.id, result: h(req.params) }。
  throw new Error("TODO: stage s30");
}
