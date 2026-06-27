// pnpm v:s11 —— 纯本地演示：ToolSearch 三种查询，从大目录里按需取工具。
import { banner } from "../_shared/cli.js";
import { toolSearch, type CatalogTool } from "./exercise.js";

banner("s11 · ToolSearch 三种查询体感");

const catalog: CatalogTool[] = [
  { name: "Read", description: "读取文件内容" },
  { name: "Edit", description: "编辑文件" },
  { name: "slack_send", description: "发送 slack 消息", searchHint: "message chat im" },
  { name: "slack_list", description: "列出 slack 频道" },
  { name: "NotebookEdit", description: "编辑 jupyter notebook", searchHint: "jupyter ipynb cell" },
  { name: "WebSearch", description: "搜索网页", searchHint: "google bing 联网" },
];

const queries = ["select:Read,Edit", "+slack send", "jupyter notebook", "网页"];
for (const q of queries) {
  const hits = toolSearch(q, catalog);
  console.log(`\n== query: "${q}" ==`);
  console.log("  命中：" + (hits.map((t) => t.name).join(", ") || "（无）"));
}

banner("演示完成：50 个工具不全塞 prompt，用到才搜");
