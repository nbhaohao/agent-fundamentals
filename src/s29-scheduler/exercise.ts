/**
 * 定时 Agent：到点自己干，不需要人触发。
 *
 * 到这里前面讲的都是「用户触发、Agent 响应」。但还有一类场景：每天早上自动查依赖、每周五出进度报告、
 * 每次新 PR 自动跑代码审查 —— Agent 到了时间自己开始干活。
 * 它跟传统 cron 脚本的本质区别是**目标驱动而非步骤驱动**：cron 脚本预定义每一步（「查 package.json，有过时依赖
 * 就发消息」）；定时 Agent 给的是目标（「检查代码库的安全状况」），它自己决定读哪些文件、用什么工具、怎么分析
 * —— 同一个定时任务，上次看依赖漏洞、这次可能发现 SQL 注入风险。自己搭的核心就是一个 cron 调度器 + 结果推送。
 *
 * 本关手搓调度器的最小内核 —— 一个 tick 函数（不碰真实时钟、不解析 cron 字符串，时间用毫秒数传进来，
 * 纯函数好测）。断言三件事：
 *   ① 到点（runAt <= now）的 job 触发；没到点的不触发、原样留下。
 *   ② 一次性 job（无 intervalMs）触发后从队列移除（跑完即弃）。
 *   ③ 周期 job（有 intervalMs）触发后重排到下一个 > now 的时刻、继续留在队列（且 now 跳很远也只触发一次，不补跑）。
 * 本关只做触发与重排；真实 cron 表达式解析 / 结果推送 / 进程常驻 / 崩溃恢复是部署工程，不在本关。
 * 来源：materials/raw/29-deployment.txt §"定时 Agent：到点自己干"
 */

/** 一个被调度的 job。intervalMs 存在 = 周期任务（重排）；不存在 = 一次性任务（跑完即弃）。 */
export interface Job {
  id: string;
  /** 下一次该触发的时刻（毫秒）。 */
  runAt: number;
  /** 周期（毫秒）。有值才重排，无值就是一次性。 */
  intervalMs?: number;
}

export interface TickResult {
  /** 本次 tick 触发的 job。 */
  fired: Job[];
  /** tick 之后还留在队列里的 job（含重排过的周期 job + 还没到点的）。 */
  remaining: Job[];
}

/**
 * 推进调度器一次：给定当前时刻 now，触发所有到点的 job，重排周期 job、丢弃一次性 job。
 */
export function tick(jobs: Job[], now: number): TickResult {
  // TODO: stage s29 —— ~12 行
  // 1. fired = []; remaining = []。
  // 2. for j of jobs：
  //    · j.runAt > now（没到点）→ remaining.push(j) 原样留下，跳过。
  //    · 到点了 → fired.push(j)，然后看是不是周期任务：
  //        - 有 intervalMs：把 next 从 j.runAt 反复 += intervalMs 直到 next > now（now 跳很远也只触发一次、不补跑），
  //          remaining.push({ ...j, runAt: next })。
  //        - 无 intervalMs（一次性）：不放回 remaining（跑完即弃）。
  // 3. return { fired, remaining }。
  const fired = [];
  const remaining = [];
  for (let i = 0; i < jobs.length; i++) {
    const j = jobs[i];
    if (j.runAt > now) {
      remaining.push(j);
      continue;
    }
    fired.push(j);
    if (j.intervalMs) {
      let next = j.runAt;
      while (next <= now) {
        next += j.intervalMs;
      }
      remaining.push({ ...j, runAt: next });
    }
  }
  return { fired, remaining };
}
