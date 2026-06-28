/**
 * Agent Swarm：从父子的「单向派发」升级到团队的「一起干、互相聊」。
 * 三个工程难题里，本关手搓最基础的一个 —— 通信：Mailbox（基于收件箱的消息系统）。
 * Claude Code 的方案：每个 Agent 有一个收件箱，别人往里写、自己来读；SendMessage 支持
 * 点对点（指定名字）、广播（'*' 发给所有人）。Agent 在每轮 Loop 间隙检查收件箱（像邮件不像微信）。
 * 团队的「结果汇聚」自然落在这套机制上：Worker 们把结论发给 Leader，Leader 一次性收齐。
 *
 * 本关用进程内的内存收件箱建模（对应原文 in-process 模式：同进程直接走内存队列，跳过文件 I/O）；
 * 跨进程才需要文件锁 + 重试退避，那是 Claude Code 的工程化，不是本关重点。
 * 本关只做消息传递 + 汇聚；权限代理 / 审批关闭 / 两种执行后端是概念。
 * 来源：materials/raw/26-agent-swarm.txt §"Mailbox：基于文件的消息系统" / §"共享任务列表"
 */

/** 一条消息：谁发的 + 内容 + 是否已读。 */
export interface Msg {
  from: string;
  text: string;
  read: boolean;
}

/** 团队收件箱：每个成员一个 inbox，支持点对点 + 广播，receive 只回未读并标记已读。 */
export class Mailbox {
  private inboxes = new Map<string, Msg[]>();

  constructor(agents: string[]) {
    for (const a of agents) this.inboxes.set(a, []);
  }

  /** 发消息。to='*' = 广播给除自己外所有人；to 是未知成员名 → 抛错。 */
  send(from: string, to: string, text: string): void {
    // TODO: stage s26 —— ~6 行
    // 1. 若 to === '*'：遍历所有 inbox，给「名字 !== from」的每个成员 push {from, text, read:false}（自己不收）
    // 2. 否则点对点：this.inboxes.get(to)，拿不到（未知成员）→ throw new Error
    //    拿到就 push {from, text, read:false}
    throw new Error("TODO: stage s26");
  }

  /** 取某成员收件箱里的未读消息，标记为已读后返回（再次 receive 不会重复拿到）。 */
  receive(agent: string): Msg[] {
    // TODO: stage s26 —— ~4 行
    // 1. 取该 agent 的 inbox（没有就空数组）
    // 2. 过滤出 read===false 的消息
    // 3. 把这些标记成 read=true（下次 receive 不再返回）
    // 4. 返回这批未读
    throw new Error("TODO: stage s26");
  }
}
