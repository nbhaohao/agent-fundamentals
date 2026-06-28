// 已就位（AI 生成）· 最小 mock embedding：把文本变成「词频向量」（词→出现次数），
// 用余弦相似度比距离。真实 RAG 用 Gemini/OpenAI embedding 模型，这里手搓最小版理解原理
// （语义相近=向量近）。同一份向量也给 s21 混合检索复用。

/** 一段可检索的文本块（chunk）。 */
export interface Chunk {
  id: string;
  text: string;
}

/** 分词：按非字母数字/中文切，转小写。 */
export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+|[一-龥]/g) ?? []);
}

/** mock embedding = 词频向量（词 → 次数）。 */
export function mockEmbed(text: string): Record<string, number> {
  const v: Record<string, number> = {};
  for (const w of tokenize(text)) v[w] = (v[w] ?? 0) + 1;
  return v;
}

/** 余弦相似度：两个词频向量越像，值越接近 1。 */
export function cosine(a: Record<string, number>, b: Record<string, number>): number {
  let dot = 0;
  for (const k of Object.keys(a)) dot += a[k] * (b[k] ?? 0);
  const norm = (v: Record<string, number>) => Math.sqrt(Object.values(v).reduce((s, x) => s + x * x, 0));
  const d = norm(a) * norm(b);
  return d === 0 ? 0 : dot / d;
}

/** 示例知识库：一个小团队 wiki 的若干 chunk。 */
export const KB: Chunk[] = [
  { id: "deploy-cmd", text: "部署服务的命令：先 pnpm build，再 pnpm deploy --prod，最后检查健康检查端点。" },
  { id: "deploy-arch", text: "部署架构概览：服务跑在三台机器上，前面有负载均衡，数据库主从分离。" },
  { id: "oncall", text: "值班手册：线上告警先看 Grafana 面板，连接被拒 ECONNREFUSED 通常是上游服务挂了。" },
  { id: "test", text: "测试约定：用 vitest 不用 jest，跑 pnpm test 全量回归。" },
  { id: "style", text: "代码风格：commit message 用中文，不要在里面加 emoji。" },
];
