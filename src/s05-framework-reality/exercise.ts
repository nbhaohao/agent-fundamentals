/** 一个链式步骤：拿上一步的输出，产出这一步的输出。 */
export type ChainStep = (input: string) => Promise<string>;

/**
 * 「框架式」编排：预定义好的线性步骤，按固定顺序把输出串起来跑。
 * 这就是 Anthropic 说的 Workflow——执行路径写死在代码里。
 * 对照 s03 的 agent loop：那里步数和走向由模型自己决定（自主），这里由你提前编排死（可控但不灵活）。
 * 这一关用最小代码体感「框架到底藏了什么、又牺牲了什么」。
 *
 * @returns 跑完所有步骤后、最后一步的输出
 */
export async function runChain(steps: ChainStep[], input: string): Promise<string> {
    let cur = input
    for (const step of steps) {
        cur = await step(cur);
    }
    return cur;
}
