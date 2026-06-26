// pnpm v:s06 —— 真打通 sonnet（需 ANTHROPIC_API_KEY）
// 用 read_file 工具演示流式 loop：模型决定读哪几个文件，你看事件一条条 yield 出来。
import { readFile } from "node:fs/promises";
import { streamLoop } from "./exercise.js";
import { createAnthropicLLM } from "../_shared/llm.js";
import { banner, requireKey } from "../_shared/cli.js";
import type { Tool, ToolCall, ToolResult, Message } from "../_shared/types.js";

requireKey();

const tools: Tool[] = [
  {
    name: "read_file",
    description: "读取文本文件（只读安全，可并发）",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    execute: async (a) => {
      try { return await readFile(String(a.path), "utf8"); }
      catch (e) { return "ERR: " + (e as Error).message; }
    },
  },
  {
    name: "write_file",
    description: "写入文件（写操作，必须串行）",
    parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } } },
    execute: async (a) => `[dry-run] 模拟写入 ${a.path}`,
  },
];
const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

const llm = createAnthropicLLM();
const llmWithTools = {
  chat: async (msgs: Message[], opts?: any) => llm.chat(msgs, { ...opts, tools }),
};

const execute = async (c: ToolCall): Promise<ToolResult> => {
  const t = byName[c.name];
  const result = t ? await t.execute(c.args) : "ERR: 未知工具 " + c.name;
  return { toolCallId: c.id, content: result };
};

banner("s06 · 流式 loop 事件流");
const messages: Message[] = [
  { role: "user", content: "读一下 package.json 和 vitest.config.ts，然后用一句话总结这个项目" },
];

for await (const event of streamLoop(messages, llmWithTools as any, execute)) {
  if (event.type === "text") console.log("[文字]", event.text || "(空)");
  else if (event.type === "tool_start") console.log("[→ 工具开始]", event.name, event.id);
  else if (event.type === "tool_end") console.log("[← 工具结束]", event.name, "→", event.result.slice(0, 60));
  else if (event.type === "done") console.log("\n✅ loop 完成");
}
