// pnpm v:s09 —— 纯本地演示：约束解码保证不了语义，校验器是第一道防线。
import { banner } from "../_shared/cli.js";
import { validateToolCall, type ToolSchema } from "./exercise.js";

banner("s09 · Function Calling 参数校验体感");

const schema: ToolSchema = {
  city: { type: "string", required: true },
  action: { type: "string", enum: ["read", "write", "delete"] },
};

const cases: Record<string, Record<string, unknown>> = {
  "合法调用": { city: "北京", action: "read" },
  "缺必填 city": { action: "read" },
  "city 填成数字（模型乱填类型）": { city: 123, action: "read" },
  "action 幻觉出第四个值": { city: "北京", action: "destroy" },
};

for (const [label, args] of Object.entries(cases)) {
  const r = validateToolCall(schema, args);
  console.log(`\n== ${label} ==`);
  console.log(`  args = ${JSON.stringify(args)}`);
  if (r.ok) console.log("  ✅ 通过校验，可以执行");
  else console.log("  ⛔ 拦下，回给模型的错误：\n     - " + r.errors.join("\n     - "));
}

banner("演示完成：格式对 ≠ 语义对，幻觉值靠校验拦");
