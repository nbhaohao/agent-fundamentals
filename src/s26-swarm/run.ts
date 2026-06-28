// pnpm v:s26 —— 纯本地演示，不需要 key。看 Leader 广播分工、Worker 各自回传、Leader 汇聚。
import { banner } from "../_shared/cli.js";
import { Mailbox } from "./exercise.js";

banner("s26 · Swarm Mailbox：消息传递 + 结果汇聚");

const mb = new Mailbox(["leader", "auth", "pay"]);

// Leader 广播开工
mb.send("leader", "*", "开始开发：auth 做认证、pay 做支付");
for (const a of ["auth", "pay"]) {
  const got = mb.receive(a);
  console.log(`  📥 ${a} 收到广播：${got.map((m) => m.text).join(" / ")}`);
}
console.log(`  📭 leader 不收自己的广播：${JSON.stringify(mb.receive("leader"))}`);

// Worker 间点对点协商接口
mb.send("pay", "auth", "你的 token 格式定了吗？");
console.log(`  📥 auth 收到 pay 的点对点：${mb.receive("auth").map((m) => `${m.from}:${m.text}`).join("")}`);

// 结果汇聚：两个 worker 把结论发回 leader
mb.send("auth", "leader", "认证完成，token=JWT");
mb.send("pay", "leader", "支付完成，依赖 JWT");
console.log(`  📊 leader 汇聚：${mb.receive("leader").map((m) => `${m.from}=${m.text}`).join(" | ")}`);

banner("一个收件箱搞定点对点 + 广播 + 汇聚——跨进程也只需把内存换成文件");
