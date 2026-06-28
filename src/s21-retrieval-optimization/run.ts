// pnpm v:s21 —— 纯本地演示，不需要 key。看混合检索给精确错误码加分。
import { banner } from "../_shared/cli.js";
import { hybridSearch } from "./exercise.js";
import { retrieve } from "../s20-rag-pipeline/exercise.js";
import { KB } from "../s20-rag-pipeline/embed.js";

banner("s21 · 混合检索 vs 纯向量");

const q = "ECONNREFUSED"; // 精确错误码
console.log(`👤 query: ${q}\n`);
console.log("纯向量 top3:");
for (const r of retrieve(q, KB, 3)) console.log(`  vec ${r.score.toFixed(3)}  ${r.id}`);

console.log("\n混合 (0.7×向量 + 0.3×关键词) top3:");
for (const r of hybridSearch(q, KB, 3)) console.log(`  score ${r.score.toFixed(3)}  vec ${r.vec.toFixed(3)} kw ${r.kw.toFixed(3)}  ${r.id}`);

console.log("\noncall 含精确错误码 → BM25 关键词分顶起来；其余 chunk 关键词分都是 0.5 基线（没命中）");

banner("两路分数量纲不同（余弦 0..1 / BM25 开放正数），必须各自归一化再加权");
