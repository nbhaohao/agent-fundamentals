// pnpm v:s12 —— 纯本地演示：mock transport 当 MCP Server，看命名空间隔离。
import { banner } from "../_shared/cli.js";
import { MinimalMcpClient, type Transport } from "./exercise.js";

banner("s12 · 最小 MCP 客户端体感");

// mock 一个 supabase MCP server
const transport: Transport = async (req) => {
  console.log(`  📡 JSON-RPC → ${req.method} ${req.params ? JSON.stringify(req.params) : ""}`);
  if (req.method === "tools/list") {
    return { result: { tools: [
      { name: "execute_sql", description: "执行 SQL" },
      { name: "list_tables", description: "列出表" },
    ] } };
  }
  if (req.method === "tools/call") {
    return { result: { content: `[结果] 已执行 ${(req.params as any).name}` } };
  }
  return { error: { message: "unknown method" } };
};

const client = new MinimalMcpClient("supabase", transport);

console.log("\n== listTools（注意工具名被加了命名空间）==");
const tools = await client.listTools();
for (const t of tools) console.log(`  • ${t.name} — ${t.description}`);

console.log("\n== callTool（去前缀转发裸名给 server）==");
const out = await client.callTool("mcp__supabase__execute_sql", { sql: "select 1" });
console.log("  → " + out);

banner("演示完成：mcp__server__tool 前缀避免多 server 工具名冲突");
