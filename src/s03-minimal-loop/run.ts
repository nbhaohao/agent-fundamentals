// pnpm v:s03 —— 真打通 LLM：给 runLoop 接真 Anthropic + 真 read_file 工具，跑一个真任务看它自己转几轮。
import { readFile } from "node:fs/promises";
import { runLoop } from "./exercise.js";
import { createDeepSeekLLM } from "../_shared/llm.js";
import { banner, traceTool, traceSay, requireKey } from "../_shared/cli.js";
import type { LLM, Tool, ToolCall, ToolResult } from "../_shared/types.js";

requireKey();

const tools: Tool[] = [
  {
    name: "read_file",
    description: "读取一个文本文件的内容（相对当前目录）",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
    execute: async (a) => {
      try {
        return await readFile(String(a.path), "utf8");
      } catch (e) {
        return "ERR: " + (e as Error).message;
      }
    },
  },
];
const byName = Object.fromEntries(tools.map((t) => [t.name, t]));

const execute = async (c: ToolCall): Promise<ToolResult> => {
  const t = byName[c.name];
  const result = t ? await t.execute(c.args) : "ERR: 未知工具 " + c.name;
  traceTool(c.name, c.args, result.slice(0, 160));
  return { toolCallId: c.id, content: result };
};

// 关键：loop 本身工具无关。把 tools 注入到「llm」里——runLoop 调 llm.chat(messages) 时自动带上工具定义。
const base = createDeepSeekLLM();
const llm: LLM = {
  chat: async (messages, opts) => {
    const r = await base.chat(messages, { ...opts, tools });
    traceSay(r.text);
    return r;
  },
};

banner("s03 · 最小 ReAct loop 真打通");
const task = process.argv[2] ?? "读一下 package.json，用一句话告诉我这个项目叫什么、有哪些 script";
console.log("  📌 任务：" + task + "\n");
const out = await runLoop([{ role: "user", content: task }], llm, execute);
banner("结束 · 模型共说了 " + out.filter((m) => m.role === "assistant").length + " 轮");
