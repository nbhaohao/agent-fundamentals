// 已就位（AI 生成）· 极简 trace 打印，给每个 run.ts 复用（真打通 LLM 时看 agent 一步步在干嘛）。

export function banner(title: string): void {
  console.log("\n" + "═".repeat(48) + "\n  " + title + "\n" + "═".repeat(48));
}

/** 打印一次工具调用 + 结果，缩进区分。 */
export function traceTool(name: string, args: unknown, result: string): void {
  console.log(`  🔧 ${name}(${JSON.stringify(args)})`);
  console.log(`     → ${result.replace(/\n/g, "\n       ")}`);
}

export function traceSay(text: string): void {
  if (text.trim()) console.log(`  💬 ${text}`);
}

/** 没配 key 时给一句友好提示而不是堆栈。name 默认 DEEPSEEK_API_KEY。 */
export function requireKey(name = "DEEPSEEK_API_KEY"): void {
  if (!process.env[name]) {
    console.error(`⚠️  缺 ${name} —— 复制 .env.example 成 .env 填 key。测试(pnpm verify)不需要 key。`);
    process.exit(1);
  }
}
