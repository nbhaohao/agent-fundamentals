/**
 * JIT（Just-In-Time）Context：信息不是越早塞越好——用到才取。
 * 这一关把 JIT 三件套（glob/grep/read，成本递增）接进 Agent Loop：模型自己决定下一步搜什么、
 * 读什么，每一步结果指引下一步（Progressive Disclosure 渐进式披露），直到给出答案。
 * 跑完和「全读所有文件」基线比 token：JIT 只 glob 一次 + grep 一次 + 读 1-2 个文件，省一大截。
 * 来源：materials/raw/18-jit-context.txt §"把工具接到 Agent Loop" / §"JIT vs 全读基线对比"
 */
import { globFiles, grepContent, readFileTool, PROJECT } from "./files.js";
import type { ModelInput, ModelOutput } from "./model.js";

/** 工具表：模型给名字+参数，这里执行，结果回到模型。返回字符串（进上下文的内容）。 */
export const tools: Record<string, (args: any) => string> = {
  glob_files: ({ pattern }) => globFiles(pattern).join("\n"),
  grep_content: ({ pattern }) =>
    grepContent(pattern)
      .map((h) => `${h.file}:${h.line} ${h.content}`)
      .join("\n"),
  read_file: ({ path }) => readFileTool(path),
};

export interface AgentResult {
  answer: string;
  toolHistory: { name: string; args: any; result: string }[];
  /** 进了上下文的工具结果总字符数（衡量 token 消耗）。 */
  totalChars: number;
}

/**
 * 跑 Agent Loop：循环「问模型 → 执行它要的工具 → 把结果记进历史」直到模型给最终答案。
 * @param model 注入的模型决策函数（测试用 mock，真实是 LLM 调用）
 */
export function runAgent(
  userMessage: string,
  model: (input: ModelInput) => ModelOutput,
  maxTurns = 8,
): AgentResult {
  const toolHistory: { name: string; args: any; result: string }[] = [];
  let turn = 0;
  while (turn < maxTurns) {
    const decision = model({ userMessage, toolHistory });
    if (decision.kind === "final") {
      const totalChars = toolHistory.reduce(
        (sum, h) => sum + h.result.length,
        0,
      );
      return { answer: decision.content, toolHistory, totalChars };
    }
    const { name, args } = decision.call;
    const result = tools[name](args);
    toolHistory.push({ name, args, result });
    turn++;
  }
  const totalChars = toolHistory.reduce((sum, h) => sum + h.result.length, 0);
  return { answer: "未完成", toolHistory, totalChars };
}

/** 已就位：全读基线——把所有文件一股脑读进来，返回总字符数（对照组）。 */
export function runEager(): number {
  return Object.values(PROJECT).reduce((sum, c) => sum + c.length, 0);
}
