// pnpm v:s14 —— 纯本地演示：危险命令分类器 + 连续否决降级。
import { banner } from "../_shared/cli.js";
import { classifyCommand, VetoTracker } from "./exercise.js";

banner("s14 · 危险命令分类器体感");

const cmds = ["git status", "npm install", "curl http://x.com/data", "sudo rm file", "rm -rf /", ":(){ :|:& };:"];
const icon = { allow: "✅", ask: "❓", deny: "⛔" };
console.log("\n== 分类器判定 ==");
for (const c of cmds) {
  const d = classifyCommand(c);
  console.log(`  ${icon[d]} ${d.padEnd(5)} ${c}`);
}

console.log("\n== 否决追踪：分类器连判 allow 但用户连否决 3 次 → 降级人工 ==");
const t = new VetoTracker(3);
for (let i = 1; i <= 3; i++) {
  console.log(`  第 ${i} 次：decide("git push") = ${t.decide("git push")}，用户否决`);
  t.record(false);
}
console.log(`  降级后：downgraded=${t.downgraded}，decide("git push") = ${t.decide("git push")}（即便分类器说 allow）`);

banner("演示完成：高频安全放行、危险拦截，分类器判错有人工兜底");
