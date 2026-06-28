// 已就位（AI 生成）· 最小 BM25 关键词打分 + sigmoid 归一化。
// BM25 的关键：稀有词（idf 高）权重大——精确错误码 ECONNREFUSED 这种它碾压向量搜索。
import { tokenize } from "../s20-rag-pipeline/embed.js";

/** BM25 打分：query 在 doc 里的匹配度，结合词频(tf)和逆文档频率(idf)。 */
export function bm25(query: string, doc: string, corpus: string[]): number {
  const k1 = 1.5, b = 0.75;
  const dt = tokenize(doc);
  const dl = dt.length;
  const avgdl = corpus.reduce((s, d) => s + tokenize(d).length, 0) / corpus.length;
  const N = corpus.length;
  let score = 0;
  for (const t of new Set(tokenize(query))) {
    const n = corpus.filter((d) => tokenize(d).includes(t)).length; // 含该词的文档数
    if (n === 0) continue;
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5)); // 越稀有 idf 越大
    const f = dt.filter((w) => w === t).length;
    score += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + (b * dl) / avgdl));
  }
  return score;
}

/** sigmoid：把 BM25 的开放分值压到 0..1，才能和余弦分（0..1）加权合并。 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
