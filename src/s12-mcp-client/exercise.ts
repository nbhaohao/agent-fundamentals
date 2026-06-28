/**
 * MCP 最小客户端：MCP 的核心贡献是「标准化」——一套 JSON-RPC 2.0 协议，
 * 让任何 MCP Server 能被任何 Agent 调用。这里用注入的 mock transport 实现两个最常用方法：
 *   tools/list  列出 server 暴露的工具
 *   tools/call  调用其中一个
 * 关键工程细节：给每个工具名加三段式命名空间 mcp__<server>__<tool>，避免多 server 工具名冲突。
 * 来源：materials/raw/11-mcp.txt §"MCP 到底解决了什么" / §"命名空间隔离"
 */

export interface JsonRpcRequest {
  method: string;
  params?: Record<string, unknown>;
}
export interface JsonRpcResponse {
  result?: any;
  error?: { message: string };
}
/** 传输层：把请求发给 server、拿回响应。真实现是 stdio/HTTP，测试注入 mock。 */
export type Transport = (req: JsonRpcRequest) => Promise<JsonRpcResponse>;

export interface McpTool {
  name: string;
  description: string;
}

export class MinimalMcpClient {
  constructor(
    private readonly server: string,
    private readonly transport: Transport,
  ) {}

  /** tools/list → 给每个工具名加 mcp__<server>__ 前缀返回。 */
  async listTools(): Promise<McpTool[]> {
    const res = await this.transport({ method: "tools/list" });
    if (res.error) throw new Error(res.error.message);
    const tools = res.result?.tools ?? [];
    return tools.map((t: McpTool) => ({
      ...t,
      name: `mcp__${this.server}__${t.name}`,
    }));
  }

  /** tools/call → 去掉命名空间前缀，转发裸工具名给 server。 */
  async callTool(
    namespacedName: string,
    args: Record<string, unknown>,
  ): Promise<string> {
    const prefix = `mcp__${this.server}__`;
    const bare = namespacedName.startsWith(prefix)
      ? namespacedName.slice(prefix.length)
      : namespacedName;
    const res = await this.transport({
      method: "tools/call",
      params: { name: bare, arguments: args },
    });
    if (res.error) throw new Error(res.error.message);
    return res.result?.content ?? "";
  }
}
