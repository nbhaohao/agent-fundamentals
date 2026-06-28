// pnpm v:s17 —— 纯本地演示，不需要 key。看三级压缩按预算从轻到重逐级触发。
import { banner } from "../_shared/cli.js";
import { compress, estTokens, type CMsg } from "./exercise.js";

banner("s17 · 三级压缩体感");

const big = "x".repeat(4000); // ~1000 token 的工具结果
const msgs: CMsg[] = [
  { id: "u1", role: "user", content: "看下 auth 模块" },
  { id: "t1", role: "tool", content: "READ src/auth.ts:\n" + big },
  { id: "t2", role: "tool", content: "GREP returnTo:\n" + big },
  { id: "a1", role: "assistant", content: "找到了，在改" },
  { id: "u2", role: "user", content: "继续" },
  { id: "a2", role: "assistant", content: "最近这条要保留" },
];
const summarize = (ms: CMsg[]) => `[摘要] 压缩了 ${ms.length} 条早期消息：之前在排查 auth returnTo`;

console.log(`原始：${msgs.length} 条消息，≈ ${estTokens(msgs)} token\n`);

// 预算够松，microcompact 一层就达标
const r1 = compress(msgs, { budget: 60, recentKeep: 2, summarize });
console.log(`① 预算 60：${estTokens(r1.messages)} token，summarized=${r1.summarized}，可恢复 ${Object.keys(r1.recovered).length} 条 tool 结果`);

// 预算更紧，microcompact + snip
const r2 = compress(msgs, { budget: 20, recentKeep: 2, summarize });
console.log(`② 预算 20：${estTokens(r2.messages)} token，剩 ${r2.messages.length} 条消息（snip 删了最老的），summarized=${r2.summarized}`);

// 预算极小且要求保留窗口大，逼出 LLM 摘要
const r3 = compress(msgs, { budget: 1, recentKeep: 6, summarize });
console.log(`③ 预算 1：summarized=${r3.summarized}，摘要内容 = "${r3.messages[0].content}"`);

banner("越轻的手段越先用，够了就停；microcompact 可恢复、snip/摘要不可逆");
