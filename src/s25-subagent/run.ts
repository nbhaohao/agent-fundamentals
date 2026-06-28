// pnpm v:s25 —— 纯本地演示，不需要 key（用 mock 摘要）。看子 Agent 探索几千字符、只回传一句结论，父上下文不被污染。
import { banner } from "../_shared/cli.js";
import { mockLLM } from "../_shared/llm.js";
import { spawnSubAgent } from "./exercise.js";
import type { Message } from "../_shared/types.js";

banner("s25 · 父子模式：分上下文不是分角色");

const docs = [
  "src/auth.ts:" + "// 认证逻辑 ".repeat(200),
  "src/redirect.ts:" + "// 跳转逻辑 returnTo ".repeat(200),
  "src/router.ts:" + "// 路由表 ".repeat(200),
];
const parent: Message[] = [{ role: "user", content: "分析这个仓库，找出处理跳转的文件" }];
const llm = mockLLM([{ text: "结论：跳转逻辑在 src/redirect.ts（读了 3 个文件后定位）", toolCalls: [] }]);

const r = await spawnSubAgent(parent, "探索仓库定位跳转文件", docs, llm);

console.log(`  子 Agent 探索消耗：${r.childChars} 字符`);
console.log(`  回传父的摘要：「${r.parent[r.parent.length - 1].content}」（${r.parent[r.parent.length - 1].content.length} 字符）`);
console.log(`  压缩比：约 ${Math.round(r.childChars / r.parent[r.parent.length - 1].content.length)} 倍`);
console.log(`  父上下文条数：${parent.length} → ${r.parent.length}（只 +1 摘要，原文一字未进）`);

banner("子的几千字符完成使命后压成一句结论——父上下文始终干净");
