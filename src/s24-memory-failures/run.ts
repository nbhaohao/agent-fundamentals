// pnpm v:s24 —— 纯本地演示，不需要 key。看记忆三种失效模式被检出。
import { banner } from "../_shared/cli.js";
import { auditMemories, type Mem } from "./exercise.js";

banner("s24 · 记忆失效检测");

const world = {
  files: { "src/userService.ts": "export function getUserById(){}" },
  derivable: ["技术栈"], // 能从 package.json 推导
};
const mems: Mem[] = [
  { id: "m1", key: "技术栈", value: "用 TypeScript" }, // 冗余
  { id: "m2", key: "getUser位置", value: "在 utils.ts 第42行", file: "src/utils.ts", symbol: "getUserById" }, // 文件没了
  { id: "m3", key: "注释偏好", value: "不要写注释" }, // 与 m4 冲突
  { id: "m4", key: "注释偏好", value: "关键逻辑必须有注释" },
];

for (const i of auditMemories(mems, world)) console.log(`  [${i.type}] ${i.id}: ${i.detail}`);

banner("记忆是线索不是事实——redundant 不该存 / stale 用前验证 / conflict 现实优先");
