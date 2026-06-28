/**
 * Skills：用一个 Markdown 文件给 Agent 分发「知识 + 能力」，模型读文档就会用，不用学新协议。
 * 精妙在 Progressive Disclosure 三层加载：
 *   L1 Frontmatter（name/description/when_to_use，永远加载，~100 token/skill）
 *   L2 完整 SKILL.md 正文（命中相关时才加载）
 *   L3 references/scripts（模型用 Read 按需取）
 * 本关做 L1：解析 frontmatter + 按 description/when_to_use 做触发匹配（决定要不要进 L2）。
 * 来源：materials/raw/12-skills.txt §"Progressive Disclosure" / §"Frontmatter"
 */

export interface SkillMeta {
  name: string;
  description: string;
  whenToUse?: string;
  /** frontmatter 之后的正文（L2 内容）。 */
  body: string;
}

/**
 * 解析 SKILL.md：抽出两条 --- 之间的 YAML frontmatter（只取 name/description/when_to_use），
 * 其余是 body。没有 frontmatter 时 name/description 为空、body = 原文。
 */
export function parseSkill(md: string): SkillMeta {
  const meta: SkillMeta = { name: "", description: "", body: md };
  const match = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return meta;
  const [, front, body] = match;
  meta.body = body.trim();
  for (const line of front.trim().split("\n")) {
    const [key, value] = line.split(":").map((s) => s.trim());
    if (key === "name") meta.name = value;
    if (key === "description") meta.description = value;
    if (key === "when_to_use") meta.whenToUse = value;
  }
  return meta;
}

/**
 * 触发匹配：真实里是「模型」靠 description/when_to_use 判断 skill 与任务相关与否。
 * 这里用一个语言无关的朴素替身——字符 2-gram 重叠（中文不靠空格分词也能命中）。
 * query 和 description/whenToUse 有任意一个共同的 2 字片段就算相关。
 */
export function matchSkills(query: string, skills: SkillMeta[]): SkillMeta[] {
  // TODO: stage s13 —— ~8 行
  // 1. bigrams(s)：去空格小写后切成相邻两字片段数组（中文不靠空格分词）
  // 2. qg = bigrams(query)
  // 3. 过滤 skills：hay = (description + whenToUse) 去空格小写；qg 里任一片段被 hay 包含 → 相关
  const bigrams = (s: string) => s.toLowerCase().replace(/\s/g, "").split("");
  const qg = bigrams(query);

  return skills.filter((s) => {
    const hay = (s.description + (s.whenToUse ?? ""))
      .toLowerCase()
      .replace(/\s/g, "");
    return qg.some((q) => hay.includes(q));
  });
}
