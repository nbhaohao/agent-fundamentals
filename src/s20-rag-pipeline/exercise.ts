/**
 * RAG（检索增强生成）：模型生成回答前先「查资料」，把最相关的 chunk 塞进上下文。
 * 核心价值不是「能检索」，而是「只把最相关的内容放进上下文」——它是一种上下文管理策略，
 * 和入口管理 / 压缩 / Deferred Loading 是同一个思路。本关做检索这一环：top-k 取最相关。
 * 来源：materials/raw/19-rag-pipeline.txt §"检索：把问题转成向量找最相关 chunk" / §"RAG 是一种上下文管理策略"
 */
import { mockEmbed, cosine, type Chunk } from "./embed.js";

export interface Scored extends Chunk {
  /** 与 query 的余弦相似度。 */
  score: number;
}

/**
 * 从 chunks 里检索与 query 最相关的前 k 个（按余弦相似度降序）。
 * 这就是 RAG 管线的「检索」步：embed query → 逐块算相似度 → 取 top-k 注入上下文。
 */
export function retrieve(query: string, chunks: Chunk[], k: number): Scored[] {
  const qVec = mockEmbed(query);
  const scoredChunks = chunks.map((chunk) => ({
    ...chunk,
    score: cosine(qVec, mockEmbed(chunk.text)),
  }));
  return scoredChunks.sort((a, b) => b.score - a.score).slice(0, k);
}
