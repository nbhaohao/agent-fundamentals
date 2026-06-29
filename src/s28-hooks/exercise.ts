/**
 * Hook：不改 Agent 源码，在生命周期关键节点插一个外部脚本，定制行为。
 *
 * Claude Code 在 Agent 生命周期几乎每个关键节点都埋了 Hook 点，一共 27 种事件类型，按功能分四组：
 *   工具相关（PreToolUse / PostToolUse / PostToolUseFailure）、会话生命周期（SessionStart / Stop / …）、
 *   上下文管理（PreCompact / PostCompact）、协作相关（SubagentStart / TaskCompleted / …）。
 * 关键设计：Hook 是**外部 shell 命令**，不是代码内部的回调 —— 像 git 的 .git/hooks/pre-commit，
 *   Agent 把事件上下文以 JSON 经 stdin 传给脚本，脚本用 **exit code** 告诉 Agent 下一步：
 *     · exit 0   → 放行，一切正常
 *     · exit 2   → 阻塞，把 stderr 作为错误信息返回给**模型**（让模型看到「为什么被拦」）
 *     · 其他 exit → 非阻塞错误，只给**用户**看，不影响 Agent 继续
 * 还有一条工程原则：成功应该沉默、只有失败才发声（4000 个通过的测试结果灌进上下文会淹没 Agent）。
 *
 * 本关手搓这个 dispatcher 的最小内核，断言四件事：
 *   ① 只有「当前事件」注册的 hook 会跑（PostToolUse 的 hook 不会在 PreToolUse 触发）。
 *   ② exit 2 阻塞并短路（后面的 hook 不再跑，像 pre-commit 失败就停），stderr 进 modelError。
 *   ③ 其他非 0 exit 收进 userWarnings、不阻塞、继续往下。
 *   ④ PostToolUse 的 hook 可改写 payload（如自动 format），改完的 payload 传给后续 hook。
 * 本关只做同步 in-process dispatch；async 模式 / 10 分钟超时 / HTTP·Agent Hook / 配置只读是工程扩展，不在本关。
 * 来源：materials/raw/28-hooks-observability.txt §"Hook：不改源码就能定制 Agent 行为" / §"Hook 的执行机制"
 */

/** 一次事件的上下文：哪个事件、哪个工具、附带的结构化数据（工具参数/结果等）。 */
export interface HookCtx {
  event: string;
  toolName?: string;
  payload: Record<string, unknown>;
}

/** 一个 hook = 拿事件上下文，返回 exit code（+ 可选 stderr / 改写后的 payload）。模拟外部脚本。 */
export type Hook = (ctx: HookCtx) => {
  exitCode: number;
  stderr?: string;
  payload?: Record<string, unknown>;
};

export interface HookOutcome {
  /** 是否被某个 exit 2 的 hook 阻塞。 */
  blocked: boolean;
  /** exit 2 时的 stderr —— 回给模型看的错误信息（没有则 null）。 */
  modelError: string | null;
  /** 其他非 0 exit 的 stderr —— 只给用户看的非阻塞提示。 */
  userWarnings: string[];
  /** 经 hook（如 PostToolUse format）改写后的最终 payload。 */
  payload: Record<string, unknown>;
  /** 可观测性：每个触发的 hook 记一行（事件#序号 exit=N）。 */
  trace: string[];
}

/**
 * 派发一次事件：取出该事件注册的 hooks，按序跑，按 exit code 决定放行 / 阻塞 / 警告。
 */
export function dispatchHook(
  ctx: HookCtx,
  hooks: Record<string, Hook[]>,
): HookOutcome {
  // TODO: stage s28 —— ~12 行
  // 1. fired = hooks[ctx.event] ?? []（只取当前事件的 hook；别的事件一个都不跑）。
  // 2. out 初始：blocked=false, modelError=null, userWarnings=[], payload=ctx.payload, trace=[]。
  // 3. 按序 for (i, hook) of fired：
  //    a. r = hook({ ...ctx, payload: out.payload }) —— 把「当前最新 payload」传给这个 hook。
  //    b. trace.push(`${ctx.event}#${i} exit=${r.exitCode}`)（观测：触发就记一行）。
  //    c. r.payload 存在 → out.payload = r.payload（hook 改写了数据，传给后续 hook）。
  //    d. r.exitCode === 2 → out.blocked=true; out.modelError = r.stderr ?? ""; break（短路，后面不跑）。
  //    e. 否则 r.exitCode !== 0 → out.userWarnings.push(r.stderr ?? "")（非阻塞，继续）。
  // 4. return out。
  const fired = hooks[ctx.event] ?? [];
  let out: HookOutcome = {
    blocked: false,
    modelError: null,
    userWarnings: [],
    payload: ctx.payload,
    trace: [],
  };
  for (let i = 0; i < fired.length; i++) {
    const r = fired[i]({ ...ctx, payload: out.payload });
    out.trace.push(`${ctx.event}#${i} exit=${r.exitCode}`);
    if (r.payload) out.payload = r.payload;
    if (r.exitCode === 2) {
      out.blocked = true;
      out.modelError = r.stderr ?? "";
      break;
    }
    if (r.exitCode !== 0) out.userWarnings.push(r.stderr ?? "");
  }
  return out;
}
