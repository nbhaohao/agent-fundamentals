// pnpm v:s13 —— 纯本地演示：解析 SKILL.md 的 frontmatter + 触发匹配。
import { banner } from "../_shared/cli.js";
import { parseSkill, matchSkills } from "./exercise.js";

banner("s13 · Skills 加载 + 触发匹配体感");

const files = [
  ["remotion", [
    "---",
    "name: remotion",
    "description: React 视频制作最佳实践",
    "when_to_use: 当用户需要创建或渲染视频时",
    "---",
    "# Remotion\n用 npx remotion 初始化项目……（L2 正文，命中才加载）",
  ].join("\n")],
  ["pdf", [
    "---",
    "name: pdf-tools",
    "description: 解析和生成 PDF 文档",
    "when_to_use: 处理 PDF 文件时",
    "---",
    "# PDF\n用 pdflib……",
  ].join("\n")],
];

const skills = files.map(([, md]) => parseSkill(md));

console.log("\n== L1：启动只加载 frontmatter（每个 skill ~100 token）==");
for (const s of skills) console.log(`  • ${s.name}: ${s.description}`);

const query = "帮我把这段动画渲染成视频";
console.log(`\n== 用户说: "${query}" → 触发匹配 ==`);
const hit = matchSkills(query, skills);
console.log("  命中（才加载 L2 正文）：" + (hit.map((s) => s.name).join(", ") || "（无）"));

banner("演示完成：Progressive Disclosure —— 用到才加载完整内容");
