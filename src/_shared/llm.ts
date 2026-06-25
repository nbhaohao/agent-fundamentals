// 已就位（AI 生成）· 全课唯一碰真 API 的地方。
// 真实现动态 import ai SDK —— 只有 run.ts 真调用时才加载，缺依赖/缺 key 不影响测试。

import type { LLM, LLMResponse, Message, Tool } from "./types.js";

/**
 * 真 Anthropic 实现：用 Vercel ai SDK（正是课程示例所用）。
 * maxSteps:1 = 只让模型走一步、把 toolCalls 交还给我们的 loop 执行（不让 SDK 替我们跑工具）。
 */
export function createAnthropicLLM(model = "claude-sonnet-4-6"): LLM {
  return {
    async chat(messages, opts) {
      const { generateText, jsonSchema } = await import("ai");
      const { anthropic } = await import("@ai-sdk/anthropic");

      const tools = Object.fromEntries(
        (opts?.tools ?? []).map((t) => [
          t.name,
          // 不给 execute → SDK 把 toolCall 还给我们；参数用 JSON Schema（本课早期不引 zod）
          { description: t.description, parameters: jsonSchema(t.parameters ?? { type: "object", properties: {} }) },
        ]),
      );

      const r = await generateText({
        model: anthropic(model),
        maxSteps: 1,
        maxTokens: opts?.maxTokens,
        tools: Object.keys(tools).length ? tools : undefined,
        messages: messages.map((m) => ({ role: m.role, content: m.content })) as any,
      });

      return {
        text: r.text,
        toolCalls: (r.toolCalls ?? []).map((c: any) => ({ id: c.toolCallId, name: c.toolName, args: c.args })),
      };
    },
  };
}

/**
 * 测试用 mock：按顺序返回预设响应。
 * 传 LLMResponse 数组（第 i 次 chat 返回第 i 个），用尽后默认返回「无工具调用」=任务完成。
 */
export function mockLLM(script: LLMResponse[]): LLM & { calls: number } {
  const m = {
    calls: 0,
    async chat(_messages: Message[], _opts?: { tools?: Tool[] }): Promise<LLMResponse> {
      const r = script[m.calls] ?? { text: "done", toolCalls: [] };
      m.calls++;
      return r;
    },
  };
  return m;
}
