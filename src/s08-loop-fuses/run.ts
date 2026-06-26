// pnpm v:s08 —— 不需要 ANTHROPIC_API_KEY，纯本地演示死循环保险丝。
import { banner } from "../_shared/cli.js";
import { mockLLM } from "../_shared/llm.js";
import { guardedLoop, LoopFuseError } from "./exercise.js";
import type { ToolCall, ToolResult } from "../_shared/types.js";

banner("s08 · 死循环检测 + max_turns 体感演示");

// 场景：mock LLM 一直返回同一个 read_file 调用，结果也相同 → 触发 dead_loop 保险丝
const tool: ToolCall = { id: "t1", name: "read_file", args: { path: "app.ts" } };
const llm = mockLLM(
  Array(30).fill({ text: "继续检查", toolCalls: [tool] }),
);

let callCount = 0;
const execute = async (c: ToolCall): Promise<ToolResult> => {
  callCount++;
  console.log(`  [工具调用 ${callCount}] ${c.name}(${JSON.stringify(c.args)}) → SAME_BODY`);
  return { toolCallId: c.id, content: "SAME_BODY" };
};

console.log("\n== 无限重复读同一文件（死循环）==");
try {
  await guardedLoop(
    [{ role: "user", content: "检查 app.ts 有没有问题" }],
    llm,
    execute,
    50,  // max_turns=50（让死循环保险丝先触发）
  );
  console.log("✅ 正常结束（如果看到这行说明 warnAt/breakAt 阈值还没到）");
} catch (e) {
  if (e instanceof LoopFuseError) {
    console.log(`\n⛔ 保险丝触发！reason=${e.reason}（共执行工具 ${callCount} 次）`);
    console.log("  → 设计正确：死循环被检测到并强制中断，没有烧穿 token。");
  } else {
    throw e;
  }
}

banner("演示完成");
