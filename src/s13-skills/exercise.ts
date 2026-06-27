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
  // TODO: stage s13 —— ~14 行
  // 1. 默认 meta = { name:"", description:"", body: md }
  // 2. 用正则抓两条 --- 之间的 front 和后面的 body：/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/
  //    没匹配到（无 frontmatter）→ return 默认 meta
  // 3. meta.body = body.trim()
  // 4. front 按行拆，每行找第一个 ":" 切 key/value（trim）
  // 5. key==="name"/"description" → 填；key==="when_to_use" → meta.whenToUse
  // 6. return meta
  throw new Error("TODO: stage s13 —— 实现 parseSkill");
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
  throw new Error("TODO: stage s13 —— 实现 matchSkills");
}
