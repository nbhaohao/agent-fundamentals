// 已就位（AI 生成）· 全课唯一碰真 API 的地方。
// 真实现动态 import ai SDK —— 只有 run.ts 真调用时才加载，缺依赖/缺 key 不影响测试。

import type { LLM, LLMResponse, Message, Tool } from "./types.js";

/**
 * 把我们内部的 Message[] 转成 AI SDK 的 CoreMessage[]。
 * 第二轮起 messages 会含 assistant(带 toolCalls) 和 tool 两种消息——SDK 要求它们的 content
 * 是结构化 parts（tool-call / tool-result），不能是裸字符串，所以这里逐条转。
 * tool 结果的 part 需要 toolName，我们的 ToolResult 没存，从前面 assistant 的 toolCalls 按 id 回查。
 */
function toCoreMessages(messages: Message[]): any[] {
  const nameById: Record<string, string> = {};
  for (const m of messages) for (const c of m.toolCalls ?? []) nameById[c.id] = c.name;

  return messages.map((m) => {
    if (m.role === "assistant" && m.toolCalls?.length) {
      const parts: any[] = [];
      if (m.content) parts.push({ type: "text", text: m.content });
      for (const c of m.toolCalls) parts.push({ type: "tool-call", toolCallId: c.id, toolName: c.name, args: c.args });
      return { role: "assistant", content: parts };
    }
    if (m.role === "tool") {
      return {
        role: "tool",
        content: [{ type: "tool-result", toolCallId: m.toolCallId, toolName: nameById[m.toolCallId ?? ""] ?? "tool", result: m.content }],
      };
    }
    return { role: m.role, content: m.content };
  });
}

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
        messages: toCoreMessages(messages),
      });

      return {
        text: r.text,
        toolCalls: (r.toolCalls ?? []).map((c: any) => ({ id: c.toolCallId, name: c.toolName, args: c.args })),
      };
    },
  };
}

/**
 * DeepSeek 实现（deepseek-chat = DeepSeek-V3，支持工具调用）。
 * DeepSeek 的 API 兼容 OpenAI 格式，所以用 @ai-sdk/openai 的 createOpenAI 把 baseURL 指过去
 * （专门的 @ai-sdk/deepseek 包只配 AI SDK 5，本课用的是 AI SDK 4）。
 * 接口与 createAnthropicLLM 完全相同，run.ts 直接换就行。
 */
export function createDeepSeekLLM(model = "deepseek-chat"): LLM {
  return {
    async chat(messages, opts) {
      const { generateText, jsonSchema } = await import("ai");
      const { createOpenAI } = await import("@ai-sdk/openai");

      const deepseek = createOpenAI({
        baseURL: "https://api.deepseek.com/v1",
        apiKey: process.env.DEEPSEEK_API_KEY,
      });

      const tools = Object.fromEntries(
        (opts?.tools ?? []).map((t) => [
          t.name,
          { description: t.description, parameters: jsonSchema(t.parameters ?? { type: "object", properties: {} }) },
        ]),
      );

      const r = await generateText({
        model: deepseek(model),
        maxSteps: 1,
        maxTokens: opts?.maxTokens,
        tools: Object.keys(tools).length ? tools : undefined,
        messages: toCoreMessages(messages),
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
