/**
 * Deferred Loading：工具太多（50+）模型选不准、上下文被 Schema 吃光。
 * 解法——初始 prompt 只给工具「名字+一句描述」，模型需要某个工具时调 ToolSearch 取完整定义。
 * 这里实现 ToolSearch 的检索逻辑（原文三种查询方式）。
 * 来源：materials/raw/10-dynamic-tools.txt §"延迟工具的发现机制" / ToolSearch 三种查询
 */

export interface CatalogTool {
  name: string;
  description: string;
  /** 帮助检索的关键词短语（原文 searchHint，不展示给模型，只用于匹配）。 */
  searchHint?: string;
  /** 完整 schema——初始不暴露，ToolSearch 命中后才返回。 */
  schema?: Record<string, unknown>;
}

/**
 * ToolSearch：在工具目录里按 query 检索，返回命中工具的完整定义。
 * 三种查询语法（原文）：
 *   "select:Read,Edit,Grep"  精确选择——按名直接取
 *   "+slack send"            必选+排序——name 必须含 slack，再按其余词相关性排
 *   "notebook jupyter"       关键词搜索——模糊匹配 name/description/searchHint，按命中数排
 */
export function toolSearch(
  query: string,
  catalog: CatalogTool[],
): CatalogTool[] {
  // TODO: stage s11 —— ~22 行，三个分支
  // ① q.startsWith("select:")：取 "select:" 之后逗号分隔的 names，按名 catalog.find 精确返回（过滤找不到的）
  // 辅助：hay(t) = `${name} ${description} ${searchHint}`.toLowerCase()；
  //       score(t, words) = words 里有几个被 hay 包含
  // ② q.startsWith("+")：第一个词(去+)是必含子串 must，其余词 restWords 用于排序；
  //    catalog.filter(name 含 must).sort(按 score(restWords) 降序)
  // ③ 否则关键词搜索：words = q 按空格切；catalog 算 score，过滤 score>0，按 score 降序返回
  const hay = (t: CatalogTool) =>
    `${t.name} ${t.description} ${t.searchHint ?? ""}`.toLowerCase();
  const score = (t: CatalogTool, words: string[]) =>
    words.filter((w) => hay(t).includes(w)).length;

  if (query.startsWith("select:")) {
    const names = query.slice(7).split(",");
    return names
      .map((name) => catalog.find((t) => t.name === name.trim()))
      .filter((t): t is CatalogTool => t !== undefined);
  } else if (query.startsWith("+")) {
    const must = query.slice(1).split(" ")[0];
    const rest = query.slice(1).split(" ").slice(1);
    return catalog
      .filter((t) => t.name.includes(must))
      .sort((a, b) => score(b, rest) - score(a, rest));
  } else {
    const words = query.split(" ");
    return catalog
      .filter((t) => score(t, words) > 0)
      .sort((a, b) => score(b, words) - score(a, words));
  }
}
