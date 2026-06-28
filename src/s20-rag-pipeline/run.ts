// pnpm v:s20 —— 纯本地演示，不需要 key。看 RAG 检索按相关性排 top-k。
import { banner } from "../_shared/cli.js";
import { retrieve } from "./exercise.js";
import { KB } from "./embed.js";

banner("s20 · RAG 最小检索");

const q = "怎么部署服务";
console.log(`👤 query: ${q}\n`);
for (const r of retrieve(q, KB, 3)) console.log(`  ${r.score.toFixed(3)}  ${r.id}: ${r.text.slice(0, 22)}…`);

console.log("\n⚠️ deploy-arch(架构图) 竟排在 deploy-cmd(命令) 前面 —— 语义相似 ≠ 任务相关，下一关混合检索来治");

banner("RAG = 只把最相关的 chunk 注入上下文，本质是一种上下文管理策略");
