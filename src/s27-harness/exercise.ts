/**
 * Harness 最经典的模式：Generator / Evaluator 双 Agent 协作。
 *
 * Harness 的本质 = 一组组件，每个组件对应一个「模型做不到」的假设，合在一起构成模型的运行环境。
 * 本课前面手搓的保险丝（模型不会自己停）、压缩（上下文会退化）、记忆（模型不记得你）都是 Harness 零件。
 * 这一关补的是最后一块、也是 Anthropic 实践验证过最核心的一块 —— Generator/Evaluator。
 *
 * 假设：模型评不准自己。让 Agent 做完功能自己打分，它会「自信地称赞自己的工作，即使质量明显平庸」，
 * 还会不断「合理化」自己的决策。Anthropic 试过让 Generator 自我反省，效果很差。
 * 有效解法是架构层面的分离：一个独立的 Evaluator 来评判，而且 Evaluator **不看 Generator 的推理过程，
 * 只看最终输出**（防止被推理「污染」、替 Generator 找借口）。灵感来自 GAN：生成和判别必须分开。
 *
 * 本关手搓这个循环的最小内核，断言三件事：
 *   ① Evaluator 只拿到 output，拿不到 reasoning（推理不泄漏 = 不被污染）。
 *   ② 没过就把 feedback 喂回 Generator 重做，过了就停（先对齐验收标准 criteria 再干活）。
 *   ③ maxRounds 是上限（编排要轻、有界），到顶还没过就返回最后一稿、passed=false。
 * 本关只做 G/E 单层循环；Planner 三件套 / Sprint 分段 / Playwright 实操验收是产品级扩展，不在本关。
 * 来源：materials/raw/27-harness.txt §"两个根本性问题" / §"Generator/Evaluator：最经典的 Harness 模式"
 */

/** Generator 的一稿：output = 交付物（给 Evaluator 看），reasoning = 思考过程（绝不给 Evaluator）。 */
export interface Draft {
  output: string;
  reasoning: string;
}

/** Generator：拿任务 + 上一轮的反馈（首轮为 null），产出新一稿。 */
export type Generator = (
  task: string,
  feedback: string | null,
) => Promise<Draft>;

/** Evaluator：只拿 output + 验收标准，给出过/不过 + 反馈。签名里就没有 reasoning。 */
export type Evaluator = (
  output: string,
  criteria: string[],
) => Promise<{ pass: boolean; feedback: string }>;

export interface GEResult {
  /** 最终交付的 output（通过的那稿，或到顶的最后一稿）。 */
  output: string;
  /** 实际跑了几轮。 */
  rounds: number;
  /** 是否在 maxRounds 内通过验收。 */
  passed: boolean;
}

/**
 * 跑 Generator/Evaluator 循环：生成 → 只把 output 交给 Evaluator 验收 → 没过把反馈喂回重做，最多 maxRounds 轮。
 */
export async function generateAndEvaluate(
  task: string,
  criteria: string[],
  gen: Generator,
  evalr: Evaluator,
  maxRounds: number,
): Promise<GEResult> {
  // feedback 初始为 null（首轮没有反馈）；last 存最近一稿。
  // for round = 1..maxRounds：
  //    a. last = await gen(task, feedback) —— Generator 拿任务 + 上轮反馈，出一稿。
  //    b. verdict = await evalr(last.output, criteria) —— ⚠️ 只传 last.output，绝不传 last.reasoning！
  //    c. verdict.pass → return { output: last.output, rounds: round, passed: true }（过了就停）。
  //    d. 没过 → feedback = verdict.feedback（喂回下一轮 Generator 重做）。
  // 3. 循环跑满还没过 → return { output: last.output, rounds: maxRounds, passed: false }。
  let feedback: string | null = null;
  let last: Draft | undefined;
  for (let round = 1; round <= maxRounds; round++) {
    last = await gen(task, feedback);
    const verdict = await evalr(last.output, criteria);
    if (verdict.pass)
      return { output: last.output, rounds: round, passed: true };
    feedback = verdict.feedback;
  }
  if (last) return { output: last.output, rounds: maxRounds, passed: false };
  throw new Error("No result after max rounds");
}
