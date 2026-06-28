import { describe, it, expect } from "vitest";
import { spawnSubAgent, type DelegateResult } from "../src/s25-subagent/exercise.js";
import { mockLLM } from "../src/_shared/llm.js";
import { Mailbox } from "../src/s26-swarm/exercise.js";
import type { Message } from "../src/_shared/types.js";

// ───────────────────────── stage 1 · s25 父子模式：分上下文 ─────────────────────────
describe("stage 1 · s25 父子模式：子在干净上下文探索、压缩回传、父不被污染", () => {
  // 三篇大文档，各带唯一标记 —— 用来检测它们有没有泄漏进父上下文
  const docs = ["MARKER_A:" + "x".repeat(2000), "MARKER_B:" + "y".repeat(2000), "MARKER_C:" + "z".repeat(2000)];
  const parent: Message[] = [{ role: "user", content: "分析这个仓库" }];
  const SUMMARY = "结论：redirect 逻辑在 auth 模块";
  const newLLM = () => mockLLM([{ text: SUMMARY, toolCalls: [] }]);

  it("父上下文只多了一条摘要，子读过的原文一个字都没进父（不被污染）", async () => {
    const r: DelegateResult = await spawnSubAgent(parent, "探索 docs", docs, newLLM());
    expect(r.parent.length).toBe(parent.length + 1);
    expect(r.parent.some((m) => /MARKER_[ABC]/.test(m.content))).toBe(false);
    expect(r.parent[r.parent.length - 1].content).toBe(SUMMARY);
  });

  it("子在自己上下文里消耗大量字符，远大于回传的摘要（10 倍以上压缩比）", async () => {
    const r = await spawnSubAgent(parent, "探索 docs", docs, newLLM());
    expect(r.childChars).toBeGreaterThan(SUMMARY.length * 10);
  });

  it("子上下文与父隔离 —— 父再大，子消耗的字符不变", async () => {
    const r1 = await spawnSubAgent(parent, "探索 docs", docs, newLLM());
    const bigParent: Message[] = [...parent, { role: "assistant", content: "p".repeat(99999) }];
    const r2 = await spawnSubAgent(bigParent, "探索 docs", docs, newLLM());
    expect(r2.childChars).toBe(r1.childChars);
  });
});

// ───────────────────────── stage 2 · s26 Swarm Mailbox：消息传递 + 汇聚 ─────────────────────────
describe("stage 2 · s26 Mailbox：点对点 / 广播 / 已读追踪 / 结果汇聚", () => {
  it("点对点 + 已读追踪：发给 b 收到一次，再 receive 为空", () => {
    const mb = new Mailbox(["a", "b"]);
    mb.send("a", "b", "hi");
    expect(mb.receive("b").map((m) => m.text)).toEqual(["hi"]);
    expect(mb.receive("b")).toEqual([]);
  });

  it("广播 '*' 发给所有人，但发送者自己不收", () => {
    const mb = new Mailbox(["leader", "w1", "w2"]);
    mb.send("leader", "*", "开工");
    expect(mb.receive("w1").map((m) => m.text)).toEqual(["开工"]);
    expect(mb.receive("w2").map((m) => m.text)).toEqual(["开工"]);
    expect(mb.receive("leader")).toEqual([]);
  });

  it("结果汇聚：两个 worker 把结论发给 leader，leader 一次性收齐", () => {
    const mb = new Mailbox(["leader", "w1", "w2"]);
    mb.send("w1", "leader", "认证done");
    mb.send("w2", "leader", "支付done");
    const got = mb.receive("leader").map((m) => `${m.from}:${m.text}`);
    expect(got).toEqual(["w1:认证done", "w2:支付done"]);
  });

  it("发给未知成员抛错", () => {
    const mb = new Mailbox(["a"]);
    expect(() => mb.send("a", "ghost", "x")).toThrow("未知成员");
  });
});
