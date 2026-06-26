// pnpm v:s07 —— 不需要 ANTHROPIC_API_KEY，纯本地演示重试机制。
import { banner } from "../_shared/cli.js";
import { RetryableError, NonRetryableError, retryWithBackoff } from "./exercise.js";

banner("s07 · 指数退避重试 体感演示");

// 场景 1：模拟 429 限流 → 自动重试 → 最终成功
console.log("\n== 场景 1：429 限流，重试 2 次后成功 ==");
let calls1 = 0;
const result1 = await retryWithBackoff(
  async () => {
    calls1++;
    console.log(`  [尝试 ${calls1}] 发送请求...`);
    if (calls1 < 3) {
      console.log(`  [尝试 ${calls1}] ❌ 429 Too Many Requests`);
      throw new RetryableError("429 限流", 429);
    }
    console.log(`  [尝试 ${calls1}] ✅ 成功`);
    return "模型响应内容";
  },
  5,
  200, // 200ms 基数，演示用
);
console.log(`  结果: "${result1}" (共调 ${calls1} 次)`);

// 场景 2：401 密钥过期 → 立刻抛出，不重试
console.log("\n== 场景 2：401 密钥过期，立刻抛出 ==");
let calls2 = 0;
try {
  await retryWithBackoff(
    async () => {
      calls2++;
      console.log(`  [尝试 ${calls2}] 发送请求...`);
      throw new NonRetryableError("401 Unauthorized", 401);
    },
    3,
    50,
  );
} catch (e) {
  console.log(`  ❌ ${(e as Error).name}: ${(e as Error).message}（共调 ${calls2} 次，应为 1 次）`);
}

banner("演示完成");
