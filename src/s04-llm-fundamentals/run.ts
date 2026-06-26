// pnpm v:s04 —— 体感 KV Cache 前缀边界 + 用 DeepSeek raw API 亲眼看 cache hit tokens。
import { sharedPrefixLen } from "./exercise.js";
import { banner, requireKey } from "../_shared/cli.js";
import type { Message } from "../_shared/types.js";

requireKey();

banner("s04 · 前缀复用边界");
const base: Message[] = [
  { role: "system", content: "你是一个简洁的助手" },
  { role: "user", content: "1+1" },
  { role: "assistant", content: "2" },
];
const askTail: Message[] = [...base, { role: "user", content: "2+2" }];
const editHead: Message[] = [{ role: "system", content: "你是一个啰嗦的助手" }, ...base.slice(1)];

console.log("  追加新一轮提问 → 共享前缀 =", sharedPrefixLen(base, askTail), "（前面 3 条 cache 全保留，便宜）");
console.log("  改了开头 system → 共享前缀 =", sharedPrefixLen(base, editHead), "（前缀清零，后面 cache 全废，贵）");
console.log("  教训：稳定的东西放前面、易变的放后面，cache 命中率才高。\n");

// ── DeepSeek Prompt Cache 实测 ──────────────────────────────────────────────
// DeepSeek 自动缓存 >= 64 tokens 的 prefix，无需手动标记。
// usage 里多出 prompt_cache_hit_tokens / prompt_cache_miss_tokens 可直接观察。
// 用 raw fetch（不走 AI SDK）才能拿到这两个字段。

// ponytail: 故意写长，确保 system prompt 单独超过 DeepSeek 缓存阈值 64 tokens
const LONG_SYSTEM = "You are a professional software engineering assistant with deep expertise in " +
  "distributed systems, database internals, network protocols, operating systems, and compiler design. " +
  "When answering questions, be concise and precise — no filler words, just the key information. " +
  "When code is involved, prefer a minimal runnable example over lengthy prose. " +
  "You are fluent in Go, TypeScript, Rust, and Python. " +
  "You are familiar with Redis, PostgreSQL, Kafka, and Kubernetes internals. " +
  "Always cite trade-offs when recommending an approach. " +
  "You understand CAP theorem, MVCC, LSM trees, Raft consensus, and consistent hashing.";

async function askDeepSeek(userMsg: string, label: string) {
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: 30,
      messages: [
        { role: "system", content: LONG_SYSTEM },
        { role: "user", content: userMsg },
      ],
    }),
  });
  const data = await res.json() as any;
  const u = data.usage;
  console.log(`  ${label}`);
  console.log(`    prompt_tokens       = ${u.prompt_tokens}`);
  console.log(`    cache_hit_tokens    = ${u.prompt_cache_hit_tokens ?? 0}  ← 这些不用重算`);
  console.log(`    cache_miss_tokens   = ${u.prompt_cache_miss_tokens ?? 0}  ← 这些重新算了`);
  console.log(`    reply: ${data.choices[0].message.content.slice(0, 60)}...\n`);
}

banner("DeepSeek Prompt Cache 实测（同一 system prompt 发两次）");
console.log("  第 1 次：prefix 是新的，全部 miss\n");
await askDeepSeek("用一句话说什么是 KV Cache", "第 1 次请求");

await new Promise(r => setTimeout(r, 3000)); // 等缓存写入
console.log("  第 2 次：prefix 没变，期待 hit_tokens 大幅上升\n");
await askDeepSeek("用一句话说什么是 Raft 共识", "第 2 次请求");
