/**
 * 上下文窗口像工作台，关灯（会话结束）就清空。记忆系统就是把「下次还用得到」的东西存起来、下次摆回来。
 * Claude Code 选了最朴素的路：纯文本文件——MEMORY.md 当索引（目录页，每行一条指针 + description），
 * 正文是独立 .md。本关手搓这套文件记忆：remember 写正文+追加索引；recall 读索引、按 description 匹配读回。
 * 跨「会话」= 换一个 FileMemory 实例读同一份文件系统，照样能召回。
 * 来源：materials/raw/23-memory-system.txt §"MEMORY.md 索引 + 独立记忆文件" / §"靠现有 Write/Edit 读写记忆"
 */

/** 模拟文件系统：路径 → 内容。两个 FileMemory 共享同一个 FS = 跨会话持久化。 */
export type FS = Record<string, string>;

export interface MemInput {
  /** 文件名（不含扩展名），如 user_preferences。 */
  name: string;
  /** 一句话摘要，召回时靠它匹配当前任务是否相关。 */
  description: string;
  /** 记忆正文。 */
  body: string;
}

const INDEX = "MEMORY.md";

/** 文件记忆：用现有「文件读写」实现 remember / recall，没有专门的记忆 API。 */
export class FileMemory {
  constructor(private fs: FS) {}

  /** 记一条：写 <name>.md 正文，并在 MEMORY.md 索引追加一行指针。 */
  remember(m: MemInput): void {
    // TODO: stage s23 —— ~4 行
    // 1. 把正文写进 this.fs[m.name + '.md'] = m.body
    // 2. 读现有索引 this.fs[INDEX]（没有就空串），追加一行：
    //      '- [' + name + '](' + name + '.md) — ' + description + '\n'
    // 3. 写回 this.fs[INDEX]
    throw new Error("TODO: stage s23 —— 实现 remember");
  }

  /** 召回：读 MEMORY.md 索引，挑 description 命中 query 词的行，读回对应正文。 */
  recall(query: string): string[] {
    // TODO: stage s23 —— ~8 行
    // 1. 读 this.fs[INDEX]，没有就返回 []
    // 2. 按行拆；对每行用正则抽出 (name.md) 和 description（'— ' 之后的部分）
    // 3. 若 description 含 query 里任一个词（按空格/字符简单匹配）→ 读 this.fs[name.md] 收集
    // 4. 返回命中的正文数组
    throw new Error("TODO: stage s23 —— 实现 recall");
  }
}
