/**
 * RAG 每次从零检索、知识不积累，跨文档关联也发现不了。Karpathy 的思路：让 LLM 把原始文档「编译」
 * 成结构化 wiki——原始文档=源码，LLM=编译器，wiki=编译产物。关键在 ingest：一篇新文档进来，不只是
 * 存一条，而是扫已有条目、跟相关的建立交叉引用（互链）。一篇文档可能触发 5+ 个已有页面更新 = 知识复利。
 * 来源：materials/raw/22-knowledge-compilation.txt §"Ingest 触发多页面更新" / §"知识复利：网络效应"
 */

/** 一个 wiki 知识条目。links = 与之互链的其它条目 id。 */
export interface Entry {
  id: string;
  title: string;
  /** 实体/关键词，用来判断条目间是否相关。 */
  keywords: string[];
  summary: string;
  links: string[];
}

/** 知识库：id → 条目。 */
export type KB = Record<string, Entry>;

export interface IngestResult {
  kb: KB;
  /** 本次 ingest 被新建或更新（加了互链）的条目 id。 */
  touched: string[];
}

/**
 * 摄入一篇新文档：建条目，并和已有条目里「共享至少一个关键词」的互相加交叉引用。
 * @param doc 新文档（不带 links，links 由本函数建立）
 */
export function ingest(doc: Omit<Entry, "links">, kb: KB): IngestResult {git add -A && git commit -m "feat(m04-s22): 编译知识库 ingest 互链（共享关键词双向 + 知识复利）" && git push
  const kbCopy = { ...kb };
  const entry: Entry = { ...doc, links: [] };
  const touched: string[] = [entry.id];
  for (const e of Object.values(kbCopy)) {
    if (e.keywords.some((k) => doc.keywords.includes(k))) {
      entry.links.push(e.id);
      e.links.push(entry.id);
      touched.push(e.id);
    }
  }
  kbCopy[entry.id] = entry;
  return { kb: kbCopy, touched };
}
