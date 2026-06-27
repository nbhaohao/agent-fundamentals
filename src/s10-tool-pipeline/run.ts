// pnpm v:s10 —— 纯本地演示：一次工具调用走完管线，每步都可能拦下。
import { banner } from "../_shared/cli.js";
import { dispatchTool, type PipelineTool, type Permission } from "./exercise.js";
import type { ToolCall } from "../_shared/types.js";

banner("s10 · 工具执行管线体感");

const registry: Record<string, PipelineTool> = {
  read_file: {
    schema: { path: { type: "string", required: true } },
    execute: async (a) => `// file ${a.path}\nexport const x = 1`,
  },
  rm: {
    schema: { target: { type: "string", required: true } },
    execute: async (a) => `deleted ${a.target}`,
  },
};

// 权限：rm 一律拒
const checkPermission = (name: string): Permission => (name === "rm" ? "deny" : "allow");
const call = (name: string, args: Record<string, unknown>): ToolCall => ({ id: "c", name, args });

const trials: ToolCall[] = [
  call("read_file", { path: "app.ts" }), // 正常
  call("read_file", {}),                 // 参数非法
  call("rm", { target: "/" }),           // 权限拒绝
  call("ghost", {}),                     // 未知工具
];

for (const c of trials) {
  const r = await dispatchTool(c, registry, { checkPermission });
  console.log(`\n== ${c.name}(${JSON.stringify(c.args)}) ==`);
  console.log("  → " + r.content.replace(/\n/g, "\n    "));
}

banner("演示完成：失败不抛异常，清晰错误回填给模型自我纠正");
