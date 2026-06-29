// pnpm v:s30 —— 纯本地演示，不需要 key。喂几条 JSON-RPC 请求，看路由 + 信封 + 未知方法报错。
import { banner } from "../_shared/cli.js";
import { handleRpc, type AcpAgent, type RpcRequest } from "./exercise.js";

banner("s30 · ACP：Agent 世界的 LSP（JSON-RPC 2.0 控制接口）");

// 一个最小 ACP Agent：三个方法
const agent: AcpAgent = {
  initialize: () => ({ protocolVersion: 1, agentCapabilities: { loadSession: true } }),
  newSession: () => ({ sessionId: crypto.randomUUID().slice(0, 8) }),
  prompt: (p) => ({ stopReason: "end_turn", echo: p?.prompt }),
};

const reqs: RpcRequest[] = [
  { jsonrpc: "2.0", id: 1, method: "initialize" },
  { jsonrpc: "2.0", id: 2, method: "newSession" },
  { jsonrpc: "2.0", id: 3, method: "prompt", params: { prompt: "给这个函数加错误处理" } },
  { jsonrpc: "2.0", id: 4, method: "session/fork" }, // unstable，本 Agent 未实现
];

for (const req of reqs) {
  const res = handleRpc(req, agent);
  const tag = res.error ? `❌ error ${res.error.code} ${res.error.message}` : `✅ ${JSON.stringify(res.result)}`;
  console.log(`  → ${req.method.padEnd(12)} (id=${res.id})  ${tag}`);
}

banner("写一次 Agent，所有支持 ACP 的客户端都能接；未知方法返回标准 -32601");
