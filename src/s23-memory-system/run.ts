// pnpm v:s23 —— 纯本地演示，不需要 key。看记忆跨「会话」write/read 读回。
import { banner } from "../_shared/cli.js";
import { FileMemory, type FS } from "./exercise.js";

banner("s23 · 文件记忆跨会话");

const fs: FS = {}; // 模拟磁盘，两个会话共享
console.log("--- 会话1：记下两条 ---");
const s1 = new FileMemory(fs);
s1.remember({ name: "user_pref", description: "用户是后端工程师，前端不熟", body: "偏好 Go / 分布式系统" });
s1.remember({ name: "style", description: "commit message 用中文不加 emoji", body: "中文 commit，无 emoji" });
console.log("MEMORY.md 索引:\n" + fs["MEMORY.md"]);

console.log("--- 会话2：换个实例读同一份磁盘 ---");
const s2 = new FileMemory(fs);
console.log("recall('后端') →", s2.recall("后端"));
console.log("recall('commit') →", s2.recall("commit"));

banner("关掉会话台面清空，文件还在——下次按 description 匹配、按需召回");
