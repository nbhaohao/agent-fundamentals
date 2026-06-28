/**
 * 权限四层防线里最难的一环：Bash 危险命令分类器 + 防审批疲劳的兜底。
 * 操作按风险分级：只读/可逆默认放行，危险操作才拦——否则用户要么无脑点允许、要么开 bypass。
 * 再加一道「否决追踪」：分类器连续判错被用户否决 N 次，就不再信任它，降级为手动确认。
 * 来源：materials/raw/13-permissions.txt §"危险命令模式识别" / §"否决追踪"（LLM 分类器兜底）
 */

export type Decision = "allow" | "ask" | "deny";

/**
 * 危险命令分类器（规则版，原文危险模式列表）：
 *   deny —— 不可逆/系统级破坏：rm -rf、sudo、fork bomb、mkfs、chmod 777
 *   ask  —— 任意代码执行/网络外泄：curl、wget、ssh、python -c、node -e、eval
 *   allow—— 其余（git、npm、ls、cat… 这些日常安全命令）
 */
export function classifyCommand(cmd: string): Decision {
  // 提示：危险模式用 \b 词边界正则，避免误伤（如 "format" 不该命中 mkfs）
  const c = cmd.trim();
  if (c.match(/:\s*\|\s*:/)) return "deny";
  if (c.match(/\b(fork\s+bomb|rm\s+-rf|sudo|mkfs|chmod\s+777)\b/))
    return "deny";
  if (c.match(/\b(curl|wget|ssh|python\s+-c|node\s+-e|eval)\b/)) return "ask";
  return "allow";
}

/**
 * 否决追踪：分类器说 allow 但用户否决 → 计数；连续 maxVetoes 次 → 降级，之后一律 ask（交人工）。
 * 用户同意一次就重置信任。锚定原文「分类器在某些场景就是会判错，与其继续犯错不如让人来」。
 */
export class VetoTracker {
  private vetoes = 0;
  constructor(private readonly maxVetoes = 3) {}

  /** 记录一次「分类器判断 vs 用户决定」：用户否决 → 累加，用户同意 → 重置。 */
  record(userAgreed: boolean): void {
    if (userAgreed) this.vetoes = 0;
    else this.vetoes++;
  }

  /** 是否已降级到手动确认模式。 */
  get downgraded(): boolean {
    return this.vetoes >= this.maxVetoes;
  }

  /** 最终决策：已降级则一律 ask，否则走分类器。 */
  decide(cmd: string): Decision {
    return this.downgraded ? "ask" : classifyCommand(cmd);
  }
}
