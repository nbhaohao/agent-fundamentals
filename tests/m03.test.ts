import { describe, it, expect } from "vitest";
import { validateToolCall, type ToolSchema } from "../src/s09-function-calling/exercise.js";
import { dispatchTool, type PipelineTool } from "../src/s10-tool-pipeline/exercise.js";
import { toolSearch, type CatalogTool } from "../src/s11-deferred-tools/exercise.js";
import { MinimalMcpClient, type Transport } from "../src/s12-mcp-client/exercise.js";
import { parseSkill, matchSkills } from "../src/s13-skills/exercise.js";
import { classifyCommand, VetoTracker } from "../src/s14-permissions/exercise.js";
import type { ToolCall } from "../src/_shared/types.js";

// ───────────────────────── stage 1 · s09 参数校验 ─────────────────────────
describe("stage 1 · s09 Function Calling：schema 校验拦住 malformed args", () => {
  const schema: ToolSchema = {
    city: { type: "string", required: true },
    action: { type: "string", enum: ["read", "write", "delete"] },
  };

  it("合法参数 → ok", () => {
    expect(validateToolCall(schema, { city: "北京", action: "read" }).ok).toBe(true);
  });

  it("缺必填 / 类型错 → 拦下并给清晰错误", () => {
    const r1 = validateToolCall(schema, {});
    expect(r1.ok).toBe(false);
    expect(r1.errors.join()).toContain("city");

    const r2 = validateToolCall(schema, { city: 123 });
    expect(r2.ok).toBe(false);
    expect(r2.errors.join()).toContain("string");
  });

  it("enum 兜不住的幻觉值被拦（约束解码只保证格式不保证语义）", () => {
    const r = validateToolCall(schema, { city: "北京", action: "destroy" });
    expect(r.ok).toBe(false);
    expect(r.errors.join()).toContain("destroy");
  });
});

// ───────────────────────── stage 2 · s10 执行管线 ─────────────────────────
describe("stage 2 · s10 Tool Pipeline：校验→权限→执行→截断，错误回填不抛", () => {
  const registry: Record<string, PipelineTool> = {
    read_file: {
      schema: { path: { type: "string", required: true } },
      execute: async (a) => `内容:${a.path}`,
    },
  };
  const call = (name: string, args: Record<string, unknown>): ToolCall => ({ id: "x", name, args });

  it("正常路径：执行并回填结果", async () => {
    const r = await dispatchTool(call("read_file", { path: "a.ts" }), registry);
    expect(r.content).toBe("内容:a.ts");
  });

  it("参数非法 → 不执行，content 是清晰错误（给模型看）", async () => {
    const r = await dispatchTool(call("read_file", {}), registry);
    expect(r.content).toContain("错误");
    expect(r.content).toContain("path");
  });

  it("权限拒绝 → 不执行", async () => {
    const r = await dispatchTool(call("read_file", { path: "a.ts" }), registry, {
      checkPermission: () => "deny",
    });
    expect(r.content).toContain("权限拒绝");
  });

  it("结果超阈值 → 截断 + 提示", async () => {
    const big: Record<string, PipelineTool> = {
      dump: { schema: {}, execute: async () => "x".repeat(100) },
    };
    const r = await dispatchTool(call("dump", {}), big, { maxResultChars: 10 });
    expect(r.content.length).toBeLessThan(100);
    expect(r.content).toContain("截断");
  });
});

// ───────────────────────── stage 3 · s11 ToolSearch ─────────────────────────
describe("stage 3 · s11 Deferred Loading：ToolSearch 三种查询", () => {
  const catalog: CatalogTool[] = [
    { name: "Read", description: "读取文件内容" },
    { name: "slack_send", description: "发送 slack 消息", searchHint: "message chat" },
    { name: "slack_list", description: "列出 slack 频道" },
    { name: "NotebookEdit", description: "编辑 jupyter notebook", searchHint: "jupyter ipynb" },
  ];

  it("select: 精确选择按名取", () => {
    const r = toolSearch("select:Read,slack_list", catalog);
    expect(r.map((t) => t.name)).toEqual(["Read", "slack_list"]);
  });

  it("+ 必选过滤：name 必须含 slack", () => {
    const r = toolSearch("+slack send", catalog);
    expect(r.every((t) => t.name.includes("slack"))).toBe(true);
    // send 让 slack_send 相关性更高，排第一
    expect(r[0].name).toBe("slack_send");
  });

  it("关键词模糊匹配 name/description/searchHint", () => {
    const r = toolSearch("jupyter", catalog);
    expect(r.map((t) => t.name)).toEqual(["NotebookEdit"]);
  });
});

// ───────────────────────── stage 4 · s12 MCP client ─────────────────────────
describe("stage 4 · s12 MCP：JSON-RPC + 命名空间隔离", () => {
  const transport: Transport = async (req) => {
    if (req.method === "tools/list") {
      return { result: { tools: [{ name: "execute_sql", description: "跑 SQL" }] } };
    }
    if (req.method === "tools/call") {
      return { result: { content: `ran:${(req.params as any).name}` } };
    }
    return { error: { message: "unknown method" } };
  };

  it("listTools 给工具名加 mcp__<server>__ 前缀", async () => {
    const client = new MinimalMcpClient("supabase", transport);
    const tools = await client.listTools();
    expect(tools[0].name).toBe("mcp__supabase__execute_sql");
  });

  it("callTool 去掉前缀，转发裸工具名给 server", async () => {
    const client = new MinimalMcpClient("supabase", transport);
    const out = await client.callTool("mcp__supabase__execute_sql", { q: "select 1" });
    expect(out).toBe("ran:execute_sql");
  });
});

// ───────────────────────── stage 5 · s13 Skills ─────────────────────────
describe("stage 5 · s13 Skills：解析 frontmatter + 触发匹配", () => {
  const md = [
    "---",
    "name: remotion",
    "description: React 视频制作最佳实践",
    "when_to_use: 当用户需要创建或渲染视频时",
    "---",
    "正文：先 npx remotion 初始化项目……",
  ].join("\n");

  it("parseSkill 抽出 name/description/when_to_use + body", () => {
    const s = parseSkill(md);
    expect(s.name).toBe("remotion");
    expect(s.description).toContain("视频");
    expect(s.whenToUse).toContain("渲染");
    expect(s.body).toContain("正文");
    expect(s.body).not.toContain("---");
  });

  it("matchSkills 按 description/whenToUse 命中关键词", () => {
    const s = parseSkill(md);
    expect(matchSkills("帮我做个视频", [s])).toHaveLength(1);
    expect(matchSkills("写个排序算法", [s])).toHaveLength(0);
  });
});

// ───────────────────────── stage 6 · s14 权限分类器 ─────────────────────────
describe("stage 6 · s14 危险命令分类器 + 否决降级", () => {
  it("classifyCommand：危险 deny / 网络 ask / 日常 allow", () => {
    expect(classifyCommand("rm -rf /")).toBe("deny");
    expect(classifyCommand("sudo apt install x")).toBe("deny");
    expect(classifyCommand(":(){ :|:& };:")).toBe("deny");
    expect(classifyCommand("curl http://x.com")).toBe("ask");
    expect(classifyCommand("git status")).toBe("allow");
    expect(classifyCommand("npm install")).toBe("allow");
  });

  it("VetoTracker：连续否决 3 次 → 降级，之后一律 ask", () => {
    const t = new VetoTracker(3);
    expect(t.decide("git status")).toBe("allow");
    t.record(false);
    t.record(false);
    expect(t.downgraded).toBe(false);
    t.record(false);
    expect(t.downgraded).toBe(true);
    expect(t.decide("git status")).toBe("ask"); // 即便分类器说 allow，也降级为 ask
  });

  it("VetoTracker：中途用户同意一次 → 重置信任", () => {
    const t = new VetoTracker(3);
    t.record(false);
    t.record(false);
    t.record(true); // 同意 → 清零
    t.record(false);
    expect(t.downgraded).toBe(false);
  });
});
