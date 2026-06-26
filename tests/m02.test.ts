import { describe, it, expect } from "vitest";
import { mockLLM } from "../src/_shared/llm.js";
import type { ToolCall, ToolResult } from "../src/_shared/types.js";
import { isReadOnly, streamLoop } from "../src/s06-streaming-loop/exercise.js";
import type { StreamEvent } from "../src/s06-streaming-loop/exercise.js";
import { classifyError, RetryableError, NonRetryableError, retryWithBackoff } from "../src/s07-api-resilience/exercise.js";
import { fingerprint, checkLoop, guardedLoop, LoopFuseError } from "../src/s08-loop-fuses/exercise.js";

// ──────────────────────────────────────────────────────────────────────────
// s06  流式 loop（async generator）
// ──────────────────────────────────────────────────────────────────────────
describe("s06 流式 loop", () => {
  it("isReadOnly: read/search/list/get 判为只读；write/edit 判为写", () => {
    expect(isReadOnly("read_file")).toBe(true);
    expect(isReadOnly("search_web")).toBe(true);
    expect(isReadOnly("list_dir")).toBe(true);
    expect(isReadOnly("get_status")).toBe(true);
    expect(isReadOnly("write_file")).toBe(false);
    expect(isReadOnly("edit_code")).toBe(false);
  });

  it("无工具调用 → 先 yield text 再 yield done", async () => {
    const llm = mockLLM([{ text: "搞定", toolCalls: [] }]);
    const execute = async (c: ToolCall): Promise<ToolResult> => ({ toolCallId: c.id, content: "" });
    const events: StreamEvent[] = [];
    for await (const e of streamLoop([{ role: "user", content: "hi" }], llm, execute)) {
      events.push(e);
    }
    expect(events[0]).toMatchObject({ type: "text", text: "搞定" });
    expect(events[events.length - 1]).toMatchObject({ type: "done" });
  });

  it("两个只读工具：tool_start x2 + tool_end x2，两次 execute 都被调用", async () => {
    const llm = mockLLM([
      {
        text: "读两个文件",
        toolCalls: [
          { id: "r1", name: "read_file", args: { path: "a.ts" } },
          { id: "r2", name: "read_file", args: { path: "b.ts" } },
        ],
      },
      { text: "完成", toolCalls: [] },
    ]);
    let execCalls = 0;
    const execute = async (c: ToolCall): Promise<ToolResult> => {
      execCalls++;
      return { toolCallId: c.id, content: "BODY" };
    };
    const events: StreamEvent[] = [];
    for await (const e of streamLoop([{ role: "user", content: "读文件" }], llm, execute)) {
      events.push(e);
    }
    expect(execCalls).toBe(2);
    expect(events.filter((e) => e.type === "tool_start").length).toBe(2);
    expect(events.filter((e) => e.type === "tool_end").length).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// s07  指数退避重试
// ──────────────────────────────────────────────────────────────────────────
describe("s07 指数退避重试", () => {
  it("classifyError: 429/529/503 → retryable；400/401/402 → non-retryable", () => {
    expect(classifyError(429)).toBe("retryable");
    expect(classifyError(529)).toBe("retryable");
    expect(classifyError(503)).toBe("retryable");
    expect(classifyError(408)).toBe("retryable");
    expect(classifyError(400)).toBe("non-retryable");
    expect(classifyError(401)).toBe("non-retryable");
    expect(classifyError(402)).toBe("non-retryable");
  });

  it("RetryableError 抛 2 次后成功 → 返回结果，共调 3 次", async () => {
    let calls = 0;
    const result = await retryWithBackoff(
      async () => {
        calls++;
        if (calls < 3) throw new RetryableError("429", 429);
        return "ok";
      },
      5,
      1, // baseDelayMs=1ms，测试快跑
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("NonRetryableError → 立刻抛出，只调 1 次", async () => {
    let calls = 0;
    await expect(
      retryWithBackoff(
        async () => {
          calls++;
          throw new NonRetryableError("401", 401);
        },
        3,
        1,
      ),
    ).rejects.toThrow(NonRetryableError);
    expect(calls).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────
// s08  死循环检测 + max_turns
// ──────────────────────────────────────────────────────────────────────────
describe("s08 死循环检测", () => {
  it("fingerprint: key 顺序不同 → 相同指纹；不同工具名 → 不同指纹；长度为 12", () => {
    const fp1 = fingerprint("read_file", { path: "a.ts", encoding: "utf8" });
    const fp2 = fingerprint("read_file", { encoding: "utf8", path: "a.ts" }); // key 顺序不同
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(12);
    expect(fingerprint("write_file", { path: "a.ts" })).not.toBe(fingerprint("read_file", { path: "a.ts" }));
  });

  it("checkLoop: 同调用+同结果连续 breakAt 次 → 返回 break", () => {
    const history = new Map();
    for (let i = 0; i < 9; i++) {
      checkLoop("read", { path: "a" }, "SAME", history, 5, 10);
    }
    expect(checkLoop("read", { path: "a" }, "SAME", history, 5, 10)).toBe("break");
  });

  it("checkLoop: 结果变了 → count 重置，不触发 break", () => {
    const history = new Map();
    for (let i = 0; i < 9; i++) {
      checkLoop("read", { path: "a" }, "SAME", history, 5, 10);
    }
    // 第 10 次结果不同 → count 重置为 1
    expect(checkLoop("read", { path: "a" }, "DIFFERENT", history, 5, 10)).toBe("ok");
  });

  it("guardedLoop: 超过 max_turns → 抛 LoopFuseError('max_turns')", async () => {
    const forever = Array(30).fill({
      text: "继续",
      toolCalls: [{ id: "t1", name: "read_file", args: { path: "a" } }],
    });
    const llm = mockLLM(forever);
    const execute = async (c: ToolCall): Promise<ToolResult> => ({ toolCallId: c.id, content: "body" });
    const err = await guardedLoop(
      [{ role: "user", content: "任务" }],
      llm,
      execute,
      3, // maxTurns=3
    ).catch((e) => e);
    expect(err).toBeInstanceOf(LoopFuseError);
    expect((err as LoopFuseError).reason).toBe("max_turns");
  });
});
