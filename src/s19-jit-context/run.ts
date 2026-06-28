// pnpm v:s19 —— 纯本地演示（mock 模型 + 内存项目，不需要 key）。
// 看 Agent 用 JIT 策略一步步定位 bug，再和「全读所有文件」基线比 token。
import { banner } from "../_shared/cli.js";
import { runAgent, runEager } from "./exercise.js";
import { mockModel } from "./model.js";

banner("s19 · JIT 探索 vs 全读基线");

const task = "用户反馈登录后总是跳到 /admin，不管之前在哪页，帮我定位这个 bug";
console.log(`👤 ${task}\n`);

const r = runAgent(task, mockModel);
r.toolHistory.forEach((h, i) => {
  const preview = h.result.length > 80 ? h.result.slice(0, 80) + " …" : h.result;
  console.log(`🔧 Turn ${i + 1}: ${h.name}(${JSON.stringify(h.args)})`);
  console.log(`   ↳ ${preview.replace(/\n/g, " / ")}`);
});
console.log(`\n🤖 ${r.answer}`);

const eager = runEager();
console.log(`\n📊 JIT 进上下文 ${r.totalChars} 字符 vs 全读 ${eager} 字符 → 省 ${(eager / r.totalChars).toFixed(1)} 倍`);

banner("放大到 200 文件的真实仓库，JIT 几乎不变、全读线性爆炸");
