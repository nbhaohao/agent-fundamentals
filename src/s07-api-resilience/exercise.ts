/**
 * 生产级 API 容错：错误分类 + 指数退避重试。
 * 来源：materials/raw/06-api-resilience.txt
 */

/** 可重试：问题在服务端，等一等可能恢复（429限流/529过载/503不可用/408超时）。 */
export class RetryableError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "RetryableError";
  }
}

/** 不可重试：问题在客户端，重试不会自愈（400格式错/401密钥过期/402欠费/403权限不足）。 */
export class NonRetryableError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "NonRetryableError";
  }
}

/**
 * 错误分类：所有重试策略的根基（来源原文）。
 * "429 和 401 用同一套逻辑处理是生产事故的常见来源。"
 *
 * @param statusCode  HTTP 响应状态码
 * @returns 'retryable' 可重试 | 'non-retryable' 立刻抛出
 */
export function classifyError(
  statusCode: number,
): "retryable" | "non-retryable" {
  return [429, 529, 503, 408].includes(statusCode)
    ? "retryable"
    : "non-retryable";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 指数退避 + 随机抖动 重试包装器。
 *
 * 核心公式（来源原文）：
 *   delay = baseDelayMs * 2^attempt + random(0..baseDelayMs)   ← 指数退避 + 抖动
 *
 * 仅在 fn 抛出 RetryableError 时重试；其他错误（含 NonRetryableError）立刻抛出。
 * attempt 超过 maxRetries 后也抛出最后一次的 RetryableError。
 *
 * @param fn          要执行的函数
 * @param maxRetries  最多重试次数（不含首次，默认 3；Claude Code 默认 10 可配）
 * @param baseDelayMs 退避基数 ms（生产 500ms；测试用小值让用例快跑）
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 100,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (!(err instanceof RetryableError) || attempt >= maxRetries) throw err;
      const delay =
        baseDelayMs * Math.pow(2, attempt) + Math.random() * baseDelayMs;
      await sleep(delay);
      attempt++;
    }
  }
}
