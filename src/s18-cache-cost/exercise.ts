/**
 * Prompt Cache：API 看到你这次请求的前缀和上次一样，这段前缀就按「缓存命中」大幅打折计费。
 * 命中靠「前缀匹配」——从第一个 block 起，只要有一个不一样，从那里到末尾全是 miss（全价）。
 * 所以最稳定的内容放最前面（缓存命中），会变的（时间戳、用户配置）放最后面。
 * 把时间戳放开头 = 每次请求前缀都变 = 后面几千 token 缓存全废。
 * 来源：materials/raw/17-cache-cost.txt §"Prompt Cache：前缀匹配" / §"坑1 时间戳放开头毁掉整个缓存"
 */

/** 一个内容块：文本 + 它的 token 数。前缀是否命中，按相邻请求逐块比 text 是否相同。 */
export interface Block {
  text: string;
  tokens: number;
}

export interface CacheOpts {
  /** 每百万 token 价格（美元）。 */
  pricePerMTok: number;
  /** 命中折扣：0.1 = 命中部分只收 1/10（Anthropic cache read 价）。 */
  hitDiscount: number;
}

export interface CacheCost {
  /** 命中（走折扣）的 token 数 = 与上次请求相同的最长前缀。 */
  hitTokens: number;
  /** 未命中（全价）的 token 数 = 前缀之后的所有块。 */
  missTokens: number;
  /** 本次请求输入成本（美元）。 */
  cost: number;
}

/**
 * 算这次请求（cur）相对上次（prev）的缓存命中与成本。
 * 最长公共前缀（逐块比 text 相同）= 命中；其余 = miss。
 */
export function cacheCost(
  prev: Block[],
  cur: Block[],
  opts: CacheOpts,
): CacheCost {
  let n = 0;
  while (prev[n] && cur[n] && prev[n].text === cur[n].text) {
    n++;
  }
  const hitTokens = cur.slice(0, n).reduce((a, b) => a + b.tokens, 0);
  const missTokens = cur.slice(n).reduce((a, b) => a + b.tokens, 0);
  const cost =
    ((hitTokens * opts.hitDiscount + missTokens) * opts.pricePerMTok) /
    1_000_000;
  return { hitTokens, missTokens, cost };
}
