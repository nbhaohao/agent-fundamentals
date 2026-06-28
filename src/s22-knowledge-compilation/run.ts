// pnpm v:s22 —— 纯本地演示，不需要 key。看一篇新文档 ingest 触发多条目互链。
import { banner } from "../_shared/cli.js";
import { ingest, type KB } from "./exercise.js";

banner("s22 · 编译知识库 ingest");

const kb: KB = {
  compA: { id: "compA", title: "竞品A", keywords: ["竞品A", "团队"], summary: "竞品A 概况", links: [] },
  trend: { id: "trend", title: "行业趋势", keywords: ["裁员", "行业"], summary: "行业动态", links: [] },
};
console.log("已有条目: compA(竞品A,团队), trend(裁员,行业)\n");

const r = ingest({ id: "layoff", title: "竞品A裁员", keywords: ["竞品A", "裁员"], summary: "竞品A 大裁员" }, kb);
console.log(`ingest「竞品A裁员」(竞品A,裁员) → 触发 ${r.touched.length} 个条目更新: ${r.touched.join(", ")}`);
console.log(`  新条目 layoff 互链到: ${r.kb["layoff"].links.join(", ")}`);
console.log(`  compA 回链: ${r.kb["compA"].links.join(", ")}`);
console.log(`  trend 回链: ${r.kb["trend"].links.join(", ")}`);

banner("一篇文档进来触发多页面更新 = 知识复利（RAG 发现不了的跨文档关联）");
