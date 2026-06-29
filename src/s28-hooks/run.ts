// pnpm v:s28 —— 纯本地演示，不需要 key（mock 的外部 hook 脚本）。
// 看三件事：PreToolUse 拦 rm -rf（exit 2 阻塞、错误回给模型）、PostToolUse 自动 format（改写 payload）、trace 观测。
import { banner, traceTool } from "../_shared/cli.js";
import { dispatchHook, type Hook } from "./exercise.js";

banner("s28 · Hook：不改源码，在生命周期节点插外部脚本");

// 注册 hook（模拟外部 shell 脚本，靠 exit code 决定放行/阻塞）
const hooks: Record<string, Hook[]> = {
  PreToolUse: [
    (c) => {
      const cmd = String(c.payload.cmd ?? "");
      if (/rm\s+-rf|DROP\s+TABLE/i.test(cmd)) return { exitCode: 2, stderr: `「${cmd}」被安全策略禁止` };
      return { exitCode: 0 };
    },
  ],
  PostToolUse: [
    (c) => ({ exitCode: 0, payload: { ...c.payload, code: "// formatted\n" + c.payload.code } }),
  ],
};

console.log("\n— 危险命令撞 PreToolUse —");
const blocked = dispatchHook({ event: "PreToolUse", toolName: "Bash", payload: { cmd: "rm -rf /" } }, hooks);
console.log(`  blocked=${blocked.blocked}  回给模型的错误：${blocked.modelError}`);
console.log(`  trace: ${JSON.stringify(blocked.trace)}`);

console.log("\n— 正常命令放行 —");
const ok = dispatchHook({ event: "PreToolUse", toolName: "Bash", payload: { cmd: "ls -la" } }, hooks);
console.log(`  blocked=${ok.blocked}  modelError=${ok.modelError}（成功沉默：无错误信息灌进上下文）`);

console.log("\n— Edit 完走 PostToolUse 自动 format —");
const post = dispatchHook({ event: "PostToolUse", toolName: "Edit", payload: { code: "const x=1" } }, hooks);
traceTool("PostToolUse format", { before: "const x=1" }, String(post.payload.code));

banner("exit 2 阻塞并把原因回给模型 / PostToolUse 改写 payload / trace 记录每次触发");
