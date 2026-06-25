// pnpm v:s04 —— 体感 KV Cache 前缀边界 + 真打通一次模型。
import { sharedPrefixLen } from "./exercise.js";
import { createAnthropicLLM } from "../_shared/llm.js";
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

const llm = createAnthropicLLM();
const r = await llm.chat([{ role: "user", content: "用一句话解释 KV Cache 为什么能省钱" }]);
console.log("  💬 模型：" + r.text);
