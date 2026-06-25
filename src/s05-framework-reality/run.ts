// pnpm v:s05 —— 真打通：把一个任务编成「写死的三步链」(Workflow)，对照 s03 的 agent loop 体会区别。
import { runChain, type ChainStep } from "./exercise.js";
import { createAnthropicLLM } from "../_shared/llm.js";
import { banner, requireKey } from "../_shared/cli.js";

requireKey();

const llm = createAnthropicLLM();
const ask = async (prompt: string) => (await llm.chat([{ role: "user", content: prompt }])).text;

// 三步全部预定义死：发散 → 选一个 → 起名。模型无权决定「要不要多走一步」。
const steps: ChainStep[] = [
  async (topic) => ask(`给「${topic}」想 3 个 side project 点子，每个一行`),
  async (ideas) => ask(`从下面挑最适合练后端的一个，只回点子本身：\n${ideas}`),
  async (idea) => ask(`给这个项目起一个简短英文代号：\n${idea}`),
];

banner("s05 · Workflow（写死的链） vs Agent（s03 自主 loop）");
const out = await runChain(steps, "用 Go 学分布式");
console.log("\n  ✅ 链跑完，最终输出：" + out);
console.log("\n  对照：s03 的 loop 步数由模型自己定、可中途纠错；这里 3 步写死，省心但不灵活。");
console.log("  这就是「别停在 LangChain 时代」——框架把 loop 藏起来了，你得知道它藏了什么。");
