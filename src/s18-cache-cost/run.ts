// pnpm v:s18 —— 纯本地演示，不需要 key。看「前缀稳定」对缓存命中和成本的影响。
import { banner } from "../_shared/cli.js";
import { cacheCost, type Block } from "./exercise.js";

banner("s18 · Prompt Cache 成本体感");

const opts = { pricePerMTok: 3, hitDiscount: 0.1 }; // Anthropic cache read ≈ 1/10
const sys: Block = { text: "你是代码助手（5000 token 静态规则）", tokens: 5000 };

// 正确：静态在前，只有新一轮消息是 miss
const prevGood = [sys, { text: "第一轮问题", tokens: 100 }];
const curGood = [...prevGood, { text: "第二轮问题", tokens: 100 }];
const good = cacheCost(prevGood, curGood, opts);
console.log(`✅ 静态在前：命中 ${good.hitTokens} token / miss ${good.missTokens} token，成本 $${good.cost.toFixed(6)}`);

// 错误：时间戳放开头，每轮第一块就变
const prevBad = [{ text: "当前时间 10:00", tokens: 10 }, sys];
const curBad = [{ text: "当前时间 10:01", tokens: 10 }, sys];
const bad = cacheCost(prevBad, curBad, opts);
console.log(`❌ 时间戳放开头：命中 ${bad.hitTokens} token / miss ${bad.missTokens} token，成本 $${bad.cost.toFixed(6)}`);

console.log(`\n同样 5000 token 的规则，放对位置成本是放错的 ${(bad.cost / good.cost).toFixed(1)} 倍`);

banner("前缀匹配：开头一变，从那里到末尾全 miss —— 最稳定的放最前面");
