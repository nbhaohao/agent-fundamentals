import { describe, it, expect } from "vitest";
import { generateAndEvaluate, type Draft } from "../src/s27-harness/exercise.js";
import { dispatchHook, type Hook, type HookCtx } from "../src/s28-hooks/exercise.js";
import { tick, type Job } from "../src/s29-scheduler/exercise.js";
import { handleRpc, type AcpAgent } from "../src/s30-acp/exercise.js";

// ───────────────────────── stage 1 · s27 Generator/Evaluator：双 Agent 验收 ─────────────────────────
describe("stage 1 · s27 Generator/Evaluator：Evaluator 只看输出、没过重做、maxRounds 有界", () => {
  const criteria = ["按钮要有 loading 态", "错误要有提示"];
  const SECRET = "SECRET_REASONING_xyz"; // 塞进 reasoning，用来检测有没有泄漏给 Evaluator

  // Generator：每轮产出带唯一标记的 output，reasoning 里都带 SECRET
  const makeGen = (outputs: string[]) => {
    let n = 0;
    const seenFeedback: (string | null)[] = [];
    const gen = async (_task: string, feedback: string | null): Promise<Draft> => {
      seenFeedback.push(feedback);
      return { output: outputs[n++] ?? "draft-final", reasoning: SECRET };
    };
    return { gen, seenFeedback };
  };
  // Evaluator：按脚本判过/不过，并记录它实际收到的 output（用来验证没拿到 reasoning）
  const makeEval = (verdicts: boolean[]) => {
    let n = 0;
    const sawOutputs: string[] = [];
    const evalr = async (output: string, _criteria: string[]) => {
      sawOutputs.push(output);
      return { pass: verdicts[n++] ?? false, feedback: "fb#" + n };
    };
    return { evalr, sawOutputs };
  };

  it("Evaluator 只拿到 output、拿不到 reasoning（推理不泄漏 = 不被污染）", async () => {
    const g = makeGen(["稿1", "稿2"]);
    const e = makeEval([false, true]);
    await generateAndEvaluate("做个登录页", criteria, g.gen, e.evalr, 5);
    expect(e.sawOutputs).toEqual(["稿1", "稿2"]);
    expect(e.sawOutputs.some((o) => o.includes(SECRET))).toBe(false);
  });

  it("没过把 feedback 喂回 Generator 重做、过了就停", async () => {
    const g = makeGen(["稿1", "稿2", "稿3"]);
    const e = makeEval([false, true]); // 第 2 轮过
    const r = await generateAndEvaluate("做个登录页", criteria, g.gen, e.evalr, 5);
    expect(r.passed).toBe(true);
    expect(r.rounds).toBe(2);
    expect(r.output).toBe("稿2");
    // 首轮反馈为 null，第 2 轮拿到第 1 轮 Evaluator 的反馈
    expect(g.seenFeedback[0]).toBe(null);
    expect(g.seenFeedback[1]).toBe("fb#1");
  });

  it("maxRounds 是上限：一直不过则跑满轮数、返回最后一稿、passed=false", async () => {
    const g = makeGen(["稿1", "稿2", "稿3"]);
    const e = makeEval([false, false, false]);
    const r = await generateAndEvaluate("做个登录页", criteria, g.gen, e.evalr, 3);
    expect(r.passed).toBe(false);
    expect(r.rounds).toBe(3);
    expect(r.output).toBe("稿3");
  });
});

// ───────────────────────── stage 2 · s28 Hook dispatcher：拦截 / 阻断 / 改写 / 观测 ─────────────────────────
describe("stage 2 · s28 Hook：按事件触发、exit 2 阻塞短路、其他非 0 警告、PostToolUse 改写 payload", () => {
  const ctx = (event: string, payload: Record<string, unknown> = {}): HookCtx => ({ event, toolName: "Bash", payload });

  it("只有当前事件注册的 hook 会跑（PostToolUse 的不会在 PreToolUse 触发）", () => {
    let postRan = false;
    const hooks: Record<string, Hook[]> = {
      PostToolUse: [() => { postRan = true; return { exitCode: 0 }; }],
    };
    const out = dispatchHook(ctx("PreToolUse"), hooks);
    expect(postRan).toBe(false);
    expect(out.trace).toEqual([]);
    expect(out.blocked).toBe(false);
  });

  it("exit 2 阻塞并短路：后面的 hook 不再跑，stderr 进 modelError", () => {
    let secondRan = false;
    const hooks: Record<string, Hook[]> = {
      PreToolUse: [
        () => ({ exitCode: 2, stderr: "rm -rf 被安全策略禁止" }),
        () => { secondRan = true; return { exitCode: 0 }; },
      ],
    };
    const out = dispatchHook(ctx("PreToolUse"), hooks);
    expect(out.blocked).toBe(true);
    expect(out.modelError).toBe("rm -rf 被安全策略禁止");
    expect(secondRan).toBe(false);
    expect(out.trace).toEqual(["PreToolUse#0 exit=2"]);
  });

  it("其他非 0 exit 收进 userWarnings、不阻塞、继续往下", () => {
    const hooks: Record<string, Hook[]> = {
      PreToolUse: [
        () => ({ exitCode: 1, stderr: "lint 有 warning" }),
        () => ({ exitCode: 0 }),
      ],
    };
    const out = dispatchHook(ctx("PreToolUse"), hooks);
    expect(out.blocked).toBe(false);
    expect(out.modelError).toBe(null);
    expect(out.userWarnings).toEqual(["lint 有 warning"]);
    expect(out.trace).toEqual(["PreToolUse#0 exit=1", "PreToolUse#1 exit=0"]);
  });

  it("PostToolUse 的 hook 可改写 payload，改完传给后续 hook", () => {
    const hooks: Record<string, Hook[]> = {
      PostToolUse: [
        (c) => ({ exitCode: 0, payload: { ...c.payload, formatted: true } }),
        (c) => ({ exitCode: 0, payload: { ...c.payload, code: "formatted-" + c.payload.code } }),
      ],
    };
    const out = dispatchHook(ctx("PostToolUse", { code: "x" }), hooks);
    expect(out.payload).toEqual({ code: "formatted-x", formatted: true });
  });
});

// ───────────────────────── stage 3 · s29 定时调度器 tick：触发 / 一次性弃 / 周期重排 ─────────────────────────
describe("stage 3 · s29 调度器：到点触发、一次性跑完即弃、周期重排不补跑", () => {
  it("到点的触发、没到点的不触发原样留下", () => {
    const jobs: Job[] = [
      { id: "a", runAt: 100 },
      { id: "b", runAt: 300 },
    ];
    const r = tick(jobs, 100);
    expect(r.fired.map((j) => j.id)).toEqual(["a"]);
    expect(r.remaining.map((j) => j.id)).toEqual(["b"]);
  });

  it("一次性 job 触发后从队列移除（再 tick 不会重复触发）", () => {
    const jobs: Job[] = [{ id: "once", runAt: 100 }];
    const r1 = tick(jobs, 100);
    expect(r1.fired.map((j) => j.id)).toEqual(["once"]);
    expect(r1.remaining).toEqual([]);
    const r2 = tick(r1.remaining, 999);
    expect(r2.fired).toEqual([]);
  });

  it("周期 job 触发后重排到下一个 > now 的时刻、继续留在队列", () => {
    const jobs: Job[] = [{ id: "cron", runAt: 100, intervalMs: 50 }];
    const r = tick(jobs, 100);
    expect(r.fired.map((j) => j.id)).toEqual(["cron"]);
    expect(r.remaining).toEqual([{ id: "cron", runAt: 150, intervalMs: 50 }]);
  });

  it("now 跳很远：周期 job 只触发一次、重排到 now 之后（不补跑）", () => {
    const jobs: Job[] = [{ id: "cron", runAt: 100, intervalMs: 50 }];
    const r = tick(jobs, 1000);
    expect(r.fired.map((j) => j.id)).toEqual(["cron"]); // 只 1 次，不是 18 次
    expect(r.remaining[0].runAt).toBeGreaterThan(1000);
  });
});

// ───────────────────────── stage 4 · s30 ACP 控制接口：JSON-RPC 路由 + 信封 ─────────────────────────
describe("stage 4 · s30 ACP：method 路由到 agent、裹 JSON-RPC 2.0 信封、未知方法 -32601", () => {
  const agent: AcpAgent = {
    initialize: () => ({ protocolVersion: 1, agentCapabilities: {} }),
    newSession: () => ({ sessionId: "sess-1" }),
    prompt: () => ({ stopReason: "end_turn" }),
  };

  it("三个方法各自路由、结果裹进 result、id 原样回显", () => {
    const r1 = handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize" }, agent);
    expect(r1).toEqual({ jsonrpc: "2.0", id: 1, result: { protocolVersion: 1, agentCapabilities: {} } });
    const r2 = handleRpc({ jsonrpc: "2.0", id: "abc", method: "newSession" }, agent);
    expect(r2.result).toEqual({ sessionId: "sess-1" });
    expect(r2.id).toBe("abc");
    const r3 = handleRpc({ jsonrpc: "2.0", id: 3, method: "prompt", params: { prompt: "hi" } }, agent);
    expect(r3.result).toEqual({ stopReason: "end_turn" });
  });

  it("未知 method → error code -32601、不含 result、id 仍回显", () => {
    const r = handleRpc({ jsonrpc: "2.0", id: 9, method: "session/fork" }, agent);
    expect(r.error?.code).toBe(-32601);
    expect(r.result).toBeUndefined();
    expect(r.id).toBe(9);
  });
});
