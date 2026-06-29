// pnpm v:s29 —— 纯本地演示，不需要 key。模拟时钟往前走，看一次性 job 跑完即弃、周期 job 反复重排。
import { banner } from "../_shared/cli.js";
import { tick, type Job } from "./exercise.js";

banner("s29 · 定时 Agent：到点自己干（tick 推进，纯函数好测）");

let queue: Job[] = [
  { id: "daily-依赖审计", runAt: 0, intervalMs: 100 }, // 周期：每 100ms 跑一次
  { id: "one-shot-发周报", runAt: 250 }, // 一次性：250ms 那一刻跑一次
];

for (const now of [0, 100, 250, 300]) {
  const r = tick(queue, now);
  const fired = r.fired.map((j) => j.id).join(", ") || "（无）";
  console.log(`  t=${now}ms  触发：${fired}   队列剩 ${r.remaining.length} 个`);
  queue = r.remaining;
}

banner("周期 job 每次触发后自动重排到下一刻、永远在队列；一次性 job 跑完即弃");
