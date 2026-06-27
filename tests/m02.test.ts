import { describe, it, expect } from "vitest";
import { streamLoop, isReadOnly } from "../src/s06-streaming-loop/exercise.js";
import { classifyError, retryWithBackoff, RetryableError, NonRetryableError } from "../src/s07-api-resilience/exercise.js";
import { fingerprint, checkLoop, guardedLoop, LoopFuseError, type LoopEntry } from "../src/s08-loop-fuses/exercise.js";
import { mockLLM } from "../src/_shared/llm.js";
import type { Message, ToolCall, ToolResult } from "../src/_shared/types.js";

// 把 streamLoop 的事件流抽干成数组，方便断言
async function drain(gen: AsyncGenerator<any>) {
  const out: any[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

// ───────────────────────── s06 · streamLoop ─────────────────────────
describe("stage 1 · s06 流式 loop：yield 事件 + 并发只读/串行写", () => {
  it("isReadOnly：read/search/list/get 关键词 → 只读，其余 → 写", () => {
    expect(isReadOnly("read_file")).toBe(true);
    expect(isReadOnly("search_web")).toBe(true);
    expect(isReadOnly("write_file")).toBe(false);
  });

  it("模型不调工具时：yield 一个 text 事件 + 一个 done 事件", async () => {
    const llm = mockLLM([{ text: "你好", toolCalls: [] }]);
    const execute = async (c: ToolCall): Promise<ToolResult> => ({ toolCallId: c.id, content: "" });
    const events = await drain(streamLoop([{ role: "user", content: "hi" }], llm, execute));
    expect(events.some((e) => e.type === "text" && e.text.includes("你好"))).toBe(true);
    expect(events[events.length - 1]).toEqual({ type: "done" });
  });

  it("只读工具并发执行：两个 tool_start 都排在两个 tool_end 之前", async () => {
    const order: string[] = [];
    const execute = async (c: ToolCall): Promise<ToolResult> => {
      order.push(c.name + "-start");
      await new Promise((r) => setTimeout(r, 10));
      order.push(c.name + "-end");
      return { toolCallId: c.id, content: "ok" };
    };
    const llm = mockLLM([
      { text: "", toolCalls: [ { id: "c1", name: "read_a", args: {} }, { id: "c2", name: "read_b", args: {} } ] },
      { text: "完成", toolCalls: [] },
    ]);
    await drain(streamLoop([{ role: "user", content: "go" }], llm, execute));
    // 并发：两个 start 排在最前（execute 内部记录的真实时序）
    expect(order.slice(0, 2).sort()).toEqual(["read_a-start", "read_b-start"]);
  });
});

// ───────────────────────── s07 · 重试 ─────────────────────────
describe("stage 2 · s07 错误分类 + 指数退避重试", () => {
  it("classifyError：429/529/503/408 可重试，401/400 不可重试", () => {
    expect(classifyError(429)).toBe("retryable");
    expect(classifyError(529)).toBe("retryable");
    expect(classifyError(401)).toBe("non-retryable");
    expect(classifyError(400)).toBe("non-retryable");
  });

  it("RetryableError 前 2 次 → 第 3 次成功，最终返回成功值", async () => {
    let calls = 0;
    const out = await retryWithBackoff(async () => {
      calls++;
      if (calls < 3) throw new RetryableError("429", 429);
      return "ok";
    }, 5, 1);
    expect(out).toBe("ok");
    expect(calls).toBe(3);
  });

  it("NonRetryableError 立刻抛出，不重试（只调 1 次）", async () => {
    let calls = 0;
    await expect(retryWithBackoff(async () => {
      calls++;
      throw new NonRetryableError("401", 401);
    }, 3, 1)).rejects.toThrow("401");
    expect(calls).toBe(1);
  });
});

// ───────────────────────── s08 · 循环保险丝 ─────────────────────────
describe("stage 3 · s08 死循环检测（指纹 + 三级响应）+ max_turns", () => {
  it("fingerprint：同 name+args（key 顺序不同）产出同一指纹", () => {
    expect(fingerprint("f", { a: 1, b: 2 })).toBe(fingerprint("f", { b: 2, a: 1 }));
    expect(fingerprint("f", { a: 1 })).not.toBe(fingerprint("g", { a: 1 }));
  });

  it("checkLoop：同调用同结果累计 → warn → break；结果变了则重置为有进展", () => {
    const history = new Map<string, LoopEntry>();
    // 同调用 + 同结果，连续累计：默认 warnAt=5, breakAt=10
    let last = "ok";
    for (let i = 1; i <= 4; i++) last = checkLoop("poll", { q: 1 }, "SAME", history);
    expect(last).toBe("ok");            // 第 4 次还没到 warnAt=5
    expect(checkLoop("poll", { q: 1 }, "SAME", history)).toBe("warn"); // 第 5 次 → warn
    // 结果变了 = 有进展 → 重置
    expect(checkLoop("poll", { q: 1 }, "NEW", history)).toBe("ok");
  });

  it("guardedLoop：死循环（同调用同结果）触发 LoopFuseError('dead_loop')", async () => {
    const tool: ToolCall = { id: "t", name: "read", args: { p: "a" } };
    const llm = mockLLM(Array(30).fill({ text: "继续", toolCalls: [tool] }));
    const execute = async (c: ToolCall): Promise<ToolResult> => ({ toolCallId: c.id, content: "SAME" });
    await expect(
      guardedLoop([{ role: "user", content: "go" }], llm, execute, 50),
    ).rejects.toMatchObject({ reason: "dead_loop" });
  });

  it("guardedLoop：args 每次不同（无死循环）但超 maxTurns → LoopFuseError('max_turns')", async () => {
    let n = 0;
    // 每轮返回不同 args（避免触发死循环检测），只由 maxTurns 拦截
    const llm = {
      async chat() {
        n++;
        return { text: "走一步", toolCalls: [{ id: String(n), name: "step", args: { n } }] };
      },
    };
    const execute = async (c: ToolCall): Promise<ToolResult> => ({ toolCallId: c.id, content: "r" + n });
    await expect(
      guardedLoop([{ role: "user", content: "go" }], llm, execute, 3),
    ).rejects.toMatchObject({ reason: "max_turns" });
  });
});
