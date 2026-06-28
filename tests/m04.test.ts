import { describe, it, expect, vi } from "vitest";
import { buildPrompt, type PromptPipe } from "../src/s16-prompt-pipe/exercise.js";
import { compress, estTokens, CLEARED, type CMsg } from "../src/s17-context-compression/exercise.js";
import { cacheCost, type Block } from "../src/s18-cache-cost/exercise.js";
import { runAgent, runEager } from "../src/s19-jit-context/exercise.js";
import { mockModel } from "../src/s19-jit-context/model.js";

// s15 是 quiz-only（五维度地图归类），无 exercise / 无测试。

// ───────────────────────── stage 2 · s16 Prompt Pipe ─────────────────────────
describe("stage 2 · s16 Prompt Pipe：null 的 section 自动消失、顺序保留", () => {
  const identity: PromptPipe = () => "你是代码助手";
  const security: PromptPipe = () => "安全规则：危险操作要确认";
  // 条件 Pipe：搜索可用时返回 null（这段不出现），不可用才提醒
  const searchNotice: PromptPipe = (ctx) =>
    ctx.webSearchEnabled === false ? "搜索工具不可用，不要尝试搜索。" : null;

  it("返回 null 的 Pipe 被丢弃，正常情况它完全不出现", () => {
    const out = buildPrompt([identity, searchNotice, security], { webSearchEnabled: true });
    expect(out).toContain("你是代码助手");
    expect(out).toContain("安全规则");
    expect(out).not.toContain("搜索工具不可用");
  });

  it("条件满足时该 Pipe 出现，且顺序按传入顺序", () => {
    const out = buildPrompt([identity, searchNotice, security], { webSearchEnabled: false });
    expect(out).toContain("搜索工具不可用");
    expect(out.indexOf("你是代码助手")).toBeLessThan(out.indexOf("搜索工具不可用"));
    expect(out.indexOf("搜索工具不可用")).toBeLessThan(out.indexOf("安全规则"));
  });

  it("片段之间用空行分隔", () => {
    expect(buildPrompt([identity, security], {})).toBe("你是代码助手\n\n安全规则：危险操作要确认");
  });
});

// ───────────────────────── stage 3 · s17 三级压缩 ─────────────────────────
describe("stage 3 · s17 三级压缩：token 降 + 关键信息可恢复", () => {
  const big = "x".repeat(4000); // ~1000 token
  // 老 tool 结果 + 最近几条对话
  const build = (): CMsg[] => [
    { id: "u1", role: "user", content: "看下 auth" },
    { id: "t1", role: "tool", content: "FILE-A:" + big },
    { id: "t2", role: "tool", content: "FILE-B:" + big },
    { id: "a1", role: "assistant", content: "在改了" },
    { id: "u2", role: "user", content: "继续" },
    { id: "a2", role: "assistant", content: "好的最近这条" },
  ];
  const summarize = (_: CMsg[]) => "摘要：之前在改 auth";

  it("没超预算 → 原样返回，不压缩", () => {
    const msgs = build();
    const r = compress(msgs, { budget: 999999, recentKeep: 2, summarize });
    expect(r.messages).toEqual(msgs);
    expect(r.summarized).toBe(false);
    expect(Object.keys(r.recovered)).toHaveLength(0);
  });

  it("①Microcompact：老 tool 结果换占位符，token 降，原文进 recovered 可恢复", () => {
    const msgs = build();
    const before = estTokens(msgs);
    // 预算够 microcompact 后达标，不必 snip
    const r = compress(msgs, { budget: 50, recentKeep: 2, summarize });
    expect(estTokens(r.messages)).toBeLessThan(before);
    expect(r.summarized).toBe(false);
    expect(r.messages).toHaveLength(msgs.length); // 没删消息，结构保留
    expect(r.recovered["t1"]).toContain("FILE-A"); // 原文可恢复
    expect(r.recovered["t2"]).toContain("FILE-B");
    expect(r.messages.find((m) => m.id === "t1")!.content).toBe(CLEARED);
  });

  it("③Auto-compact：连最近窗口都超预算 → 调 summarize，summarized=true", () => {
    const msgs = build();
    const spy = vi.fn(summarize);
    // budget 极小、recentKeep 大 → microcompact+snip 都不够，触发摘要
    const r = compress(msgs, { budget: 1, recentKeep: 6, summarize: spy });
    expect(r.summarized).toBe(true);
    expect(spy).toHaveBeenCalled();
    expect(r.messages.some((m) => m.content.includes("摘要"))).toBe(true);
  });
});

// ───────────────────────── stage 4 · s18 缓存成本 ─────────────────────────
describe("stage 4 · s18 Prompt Cache：前缀稳定才命中", () => {
  const opts = { pricePerMTok: 3, hitDiscount: 0.1 };
  const sys: Block = { text: "你是代码助手（5000 token 规则）", tokens: 5000 };

  it("前缀相同 → 命中走折扣，只有新增块全价", () => {
    const prev = [sys, { text: "第一轮问题", tokens: 100 }];
    const cur = [sys, { text: "第一轮问题", tokens: 100 }, { text: "第二轮问题", tokens: 100 }];
    const r = cacheCost(prev, cur, opts);
    expect(r.hitTokens).toBe(5100); // sys + 第一轮 命中
    expect(r.missTokens).toBe(100); // 只有第二轮 miss
  });

  it("动态内容放开头 → 前缀第一块就变，全部 miss（时间戳放开头毁缓存）", () => {
    const prev = [{ text: "当前时间 10:00", tokens: 10 }, sys];
    const cur = [{ text: "当前时间 10:01", tokens: 10 }, sys];
    const r = cacheCost(prev, cur, opts);
    expect(r.hitTokens).toBe(0); // 开头一变，后面 5000 token 全废
    expect(r.missTokens).toBe(5010);
  });

  it("稳定前缀的成本远低于全 miss（命中省钱）", () => {
    const stable = cacheCost([sys], [sys], opts).cost; // 全命中
    const allMiss = cacheCost([], [sys], opts).cost; // 无前缀全价
    expect(stable).toBeLessThan(allMiss);
    expect(stable).toBeCloseTo(allMiss * 0.1, 10); // 正好折扣比例
  });
});

// ───────────────────────── stage 5 · s19 JIT vs 全读 ─────────────────────────
describe("stage 5 · s19 JIT Agent Loop：按需探索定位 bug，比全读省 token", () => {
  const task = "用户反馈登录后总是跳到 /admin，不管之前在哪页，帮我定位这个 bug";

  it("Agent 自主探索后定位到 redirect.ts", () => {
    const r = runAgent(task, mockModel);
    expect(r.answer).toContain("redirect.ts");
    expect(r.toolHistory.some((h) => h.name === "read_file" && h.args.path.includes("redirect.ts"))).toBe(true);
  });

  it("只用了少量工具调用（glob+读约定+grep+读嫌疑文件 ≈ 4 次）", () => {
    const r = runAgent(task, mockModel);
    expect(r.toolHistory.length).toBeLessThanOrEqual(5);
    expect(r.toolHistory[0].name).toBe("glob_files"); // 先用最便宜的
  });

  it("JIT 进上下文的字符数 < 全读基线（按需取省 token）", () => {
    const r = runAgent(task, mockModel);
    expect(r.totalChars).toBeLessThan(runEager());
  });
});
