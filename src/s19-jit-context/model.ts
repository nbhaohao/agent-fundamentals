// 已就位（AI 生成）· mock 模型：模拟一个真实模型用 JIT 策略定位 bug 时的逐步决策。
// 决策逻辑严格对应「按成本递增探索」：先 glob 看结构 → 读 CLAUDE.md 看约定 →
// grep returnTo 看谁在用 → 读出嫌疑文件 redirect.ts → 给出答案。不依赖真 API。

export interface ToolCall {
  name: string;
  args: Record<string, any>;
}

export interface ModelInput {
  userMessage: string;
  toolHistory: { name: string; args: any; result: string }[];
}

export type ModelOutput =
  | { kind: "tool_call"; call: ToolCall }
  | { kind: "final"; content: string };

const SUSPECT = "src/middleware/redirect.ts";

export function mockModel(input: ModelInput): ModelOutput {
  const ran = (name: string) => input.toolHistory.filter((h) => h.name === name);
  const readPaths = ran("read_file").map((h) => h.args.path);
  const lastResult = (name: string) =>
    [...input.toolHistory].reverse().find((h) => h.name === name)?.result ?? "";

  // 1. 还没看过结构 → 先 glob（最便宜）
  if (ran("glob_files").length === 0) {
    return { kind: "tool_call", call: { name: "glob_files", args: { pattern: "**/*.{ts,md}" } } };
  }
  // 2. 还没读约定 → 读 CLAUDE.md
  if (!readPaths.includes("CLAUDE.md")) {
    return { kind: "tool_call", call: { name: "read_file", args: { path: "CLAUDE.md" } } };
  }
  // 3. 还没 grep returnTo → 看谁在用
  if (!ran("grep_content").some((h) => h.args.pattern === "returnTo")) {
    return { kind: "tool_call", call: { name: "grep_content", args: { pattern: "returnTo" } } };
  }
  // 4. grep 命中 redirect.ts 但还没读它 → 读出嫌疑文件
  if (lastResult("grep_content").includes(SUSPECT) && !readPaths.includes(SUSPECT)) {
    return { kind: "tool_call", call: { name: "read_file", args: { path: SUSPECT } } };
  }
  // 5. 探索完毕 → 给答案
  return {
    kind: "final",
    content:
      "Bug 定位：src/middleware/redirect.ts 的 postLoginRedirect 把所有用户硬编码跳到 /admin，" +
      "没有读 returnTo cookie。修复：res.redirect(req.cookies.returnTo || '/')。",
  };
}
