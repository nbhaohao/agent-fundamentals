/**
 * 记忆建好不代表完事——没有生命周期管理的记忆，用得越久越危险（33% 的事实 90 天内变得不准确）。
 * 五种失效里本关检测三种最能落地的：
 *   · redundant（冗余/污染源头）—— 能从代码/git/文档推导的就不该存（代码会变、记忆不会自动跟着变）
 *   · stale（过期）—— 记忆指名某文件/函数，是「写入时存在」的断言，可能已被改名/删除 → 用前验证
 *   · conflict（冲突）—— 同一个 key 新旧值矛盾 → 现实优先，标记出来好更新
 * 核心原则：记忆是线索不是事实，用之前先验证。
 * 来源：materials/raw/24-memory-failures.txt §"五种失效模式" / §"使用端验证防过期 / 现实优先防冲突"
 */

/** 一条记忆。file/symbol 给了就表示它断言「某文件/某符号存在」。 */
export interface Mem {
  id: string;
  /** 这条记忆讲的主题键（同 key 不同 value = 冲突）。 */
  key: string;
  value: string;
  file?: string;
  symbol?: string;
}

/** 当前现实：现存文件（路径→内容）+ 可从代码/git 推导出来的 key 列表。 */
export interface World {
  files: Record<string, string>;
  /** 能从代码/git/文档推导的 key（这些根本不该进记忆）。 */
  derivable: string[];
}

export interface Issue {
  id: string;
  type: "redundant" | "stale" | "conflict";
  detail: string;
}

/**
 * 巡检一批记忆，找出 redundant / stale / conflict 三类问题。
 */
export function auditMemories(mems: Mem[], world: World): Issue[] {
  // TODO: stage s24 —— ~16 行
  // issues = []
  // 1. redundant：若 mem.key 在 world.derivable 里 → push {redundant, '可从代码/git 推导，不该存'}
  // 2. stale：
  //      若 mem.file 给了且 world.files 里没有这个文件 → push {stale, 'file 不存在'}
  //      否则若 mem.symbol 给了且 该文件内容不含 symbol → push {stale, 'symbol 已不在'}
  // 3. conflict：同一个 key 出现多条但 value 不同 → 对涉及的每条 push {conflict, ...}
  //      （提示：先按 key 分组，组内 value 去重后大于 1 个就都算冲突）
  const issues: Issue[] = [];

  for (const mem of mems) {
    if (world.derivable.includes(mem.key)) {
      issues.push({
        id: mem.id,
        type: "redundant",
        detail: "可从代码/git 推导，不该存",
      });
    }
    if (mem.file && !world.files[mem.file]) {
      issues.push({ id: mem.id, type: "stale", detail: "file 不存在" });
    } else if (
      mem.symbol &&
      !world.files[mem.file as string]?.includes(mem.symbol)
    ) {
      issues.push({
        id: mem.id,
        type: "stale",
        detail: "symbol 已不在",
      });
    }
    const group = mems.filter((m) => m.key === mem.key);
    if (group.length > 1 && new Set(group.map((m) => m.value)).size > 1) {
      issues.push({ id: mem.id, type: "conflict", detail: "value 不同" });
    }
  }

  return issues;
}
