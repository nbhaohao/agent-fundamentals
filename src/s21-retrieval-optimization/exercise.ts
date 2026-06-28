/**
 * 纯向量搜索在生产环境不够用：语义相似 ≠ 任务相关。精确错误码、API 名这类，关键词搜索(BM25)碾压向量。
 * 混合检索 = 向量(懂语义) + 关键词(精确匹配)，加权合并。关键坑：两路分数不在一个量纲
 *（余弦 0..1、BM25 是开放正数），必须先各自归一化再合并，否则合并毫无意义（很多教程漏了这步）。
 * 来源：materials/raw/20-retrieval-optimization.txt §"混合检索 0.7 向量 + 0.3 关键词" / §"分数归一化是关键"
 */
import { mockEmbed, cosine, type Chunk } from "../s20-rag-pipeline/embed.js";
import { bm25, sigmoid } from "./bm25.js";

export interface HybridScored extends Chunk {
  /** 最终加权分。 */
  score: number;
  /** 向量分（余弦 0..1）。 */
  vec: number;
  /** 关键词分（BM25 经 sigmoid 归一化到 0..1）。 */
  kw: number;
}

/**
 * 混合检索：向量分 + 关键词分，各自归一化后按 alpha 加权合并，返回 top-k。
 * @param alpha 向量权重（默认 0.7，关键词占 0.3——语义通常比精确匹配更重要，但关键词兜精确场景）
 */
export function hybridSearch(
  query: string,
  chunks: Chunk[],
  k: number,
  alpha = 0.7,
): HybridScored[] {
  const qVec = mockEmbed(query);
  const corpus = chunks.map((c) => c.text);
  const scoredChunks = chunks.map((chunk) => {
    const vec = cosine(qVec, mockEmbed(chunk.text));
    const kw = sigmoid(bm25(query, chunk.text, corpus));
    return { ...chunk, score: alpha * vec + (1 - alpha) * kw, vec, kw };
  });
  return scoredChunks.sort((a, b) => b.score - a.score).slice(0, k);
}
