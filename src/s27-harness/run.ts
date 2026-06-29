// pnpm v:s27 —— 纯本地演示，不需要 key（mock 的 Generator/Evaluator）。
// 看 Generator 头两稿被 Evaluator 打回、第 3 稿过；Evaluator 全程只看 output，看不到 reasoning。
import { banner } from "../_shared/cli.js";
import { generateAndEvaluate, type Draft } from "./exercise.js";

banner("s27 · Generator/Evaluator：评不准自己，就架构层面分离一个 Evaluator");

const criteria = ["登录失败要有错误提示", "提交时按钮要有 loading 态"];

// Generator：前两稿故意不达标，拿到反馈后第 3 稿补齐。reasoning 是它的「小心思」，绝不该进 Evaluator。
const drafts: Draft[] = [
  { output: "登录页 v1：只有表单", reasoning: "（偷懒）先交个能跑的，错误提示先不做" },
  { output: "登录页 v2：表单 + 错误提示", reasoning: "（自我感觉良好）这版我给自己打 9 分" },
  { output: "登录页 v3：表单 + 错误提示 + loading 态", reasoning: "按反馈补齐了 loading" },
];
let gi = 0;
const gen = async (_task: string, feedback: string | null): Promise<Draft> => {
  console.log(`  📝 Generator 第 ${gi + 1} 稿${feedback ? `（收到反馈：${feedback}）` : "（首轮，无反馈）"}`);
  return drafts[gi++];
};
// Evaluator：签名里只有 output，拿不到 reasoning。逐条核对验收标准。
const evalr = async (output: string, crit: string[]) => {
  const pass = crit.every((c) => output.includes(c.includes("错误") ? "错误提示" : "loading"));
  console.log(`  🔍 Evaluator 只看到产出：「${output}」→ ${pass ? "✅ 通过" : "❌ 打回"}`);
  return { pass, feedback: pass ? "" : "缺：" + crit.filter((c) => !output.includes(c.includes("错误") ? "错误提示" : "loading")).join("、") };
};

const r = await generateAndEvaluate("做一个登录页", criteria, gen, evalr, 5);

console.log(`\n  结果：跑了 ${r.rounds} 轮，${r.passed ? "通过验收" : "到顶仍未过"}`);
console.log(`  最终交付：「${r.output}」`);
banner("Evaluator 只看输出不看推理 → 不替 Generator 找借口；没过就喂反馈重做");
