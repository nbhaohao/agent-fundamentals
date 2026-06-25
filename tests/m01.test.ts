import { describe, it, expect } from "vitest";
import { mockLLM } from "../src/_shared/llm.js";
import type { ToolCall, ToolResult } from "../src/_shared/types.js";
import { runLoop } from "../src/s03-minimal-loop/exercise.js";
import { sharedPrefixLen } from "../src/s04-llm-fundamentals/exercise.js";
import { runChain } from "../src/s05-framework-reality/exercise.js";

// s01 课程导览 / s02 六大支柱全景 = quiz-only，无 code 测试（见 stage 页总结题）

describe("s03 最小 ReAct loop", () => {
  it("模型不再调工具就停，且工具结果(observe)被回填进 messages", async () => {
    const llm = mockLLM([
      { text: "我先读一下文件", toolCalls: [{ id: "t1", name: "read_file", args: { path: "a.ts" } }] },
      { text: "搞定了", toolCalls: [] },
    ]);
    const execute = async (c: ToolCall): Promise<ToolResult> => ({ toolCallId: c.id, content: "FILE_BODY" });

    const out = await runLoop([{ role: "user", content: "读 a.ts" }], llm, execute);

    expect(llm.calls).toBe(2); // 两轮：第一轮调工具，第二轮无工具→停
    expect(out.some((m) => m.role === "tool" && m.content === "FILE_BODY")).toBe(true); // observe 回填
    expect(out[out.length - 1].content).toBe("搞定了"); // 末条是模型收尾文字
  });

  it("一开始就没有工具调用 → 一轮即停", async () => {
    const llm = mockLLM([{ text: "你好", toolCalls: [] }]);
    const execute = async (c: ToolCall): Promise<ToolResult> => ({ toolCallId: c.id, content: "" });
    const out = await runLoop([{ role: "user", content: "在吗" }], llm, execute);
    expect(llm.calls).toBe(1);
    expect(out.some((m) => m.role === "tool")).toBe(false); // 没执行过任何工具
  });
});

describe("s04 KV Cache 前缀建模", () => {
  it("改动靠后的 message：前缀保留到分叉点", () => {
    const a = [
      { role: "system" as const, content: "S" },
      { role: "user" as const, content: "U1" },
      { role: "assistant" as const, content: "A1" },
      { role: "user" as const, content: "U2-old" },
    ];
    const b = [
      { role: "system" as const, content: "S" },
      { role: "user" as const, content: "U1" },
      { role: "assistant" as const, content: "A1" },
      { role: "user" as const, content: "U2-new" },
    ];
    expect(sharedPrefixLen(a, b)).toBe(3); // 前 3 条相同，第 4 条起分叉
  });

  it("改动第 0 条 → 前缀清零（cache 全废）", () => {
    const a = [{ role: "system" as const, content: "S-old" }, { role: "user" as const, content: "U" }];
    const b = [{ role: "system" as const, content: "S-new" }, { role: "user" as const, content: "U" }];
    expect(sharedPrefixLen(a, b)).toBe(0);
  });
});

describe("s05 框架式编排 vs agent loop", () => {
  it("按固定顺序把步骤串起来，输出逐步传递", async () => {
    const steps = [
      async (s: string) => s + "-a",
      async (s: string) => s + "-b",
      async (s: string) => s + "-c",
    ];
    expect(await runChain(steps, "x")).toBe("x-a-b-c"); // 顺序固定、步数固定（写死的路径）
  });
});
