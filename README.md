# agent-fundamentals

「吃透 AI Agent 开发」原理精读课的**手搓实现**仓库。每个 stage 用最小代码把一个 agent 机制亲手跑通。

- 课程宪法：`../COURSE_SPEC.md`
- 原文锚点：`../materials/raw/NN-*.txt`
- 学习页（stage 三拍）：`learn-web/content/agent-fundamentals/mXX-stages.html`

## 用法

```bash
pnpm install
pnpm verify              # 跑当前模块测试，第一个红的就是当前关（LLM 全程 mock，不烧 token）
pnpm run v "s03"         # 只跑某一关
pnpm v:s03               # 真打通 LLM 体感冒烟（需 .env 里 ANTHROPIC_API_KEY）
```

## 纪律

- `src/_shared/` = 公共脚手架（LLM client / CLI / 类型），不重复写。
- `src/sNN-*/` = 每关聚焦实现，**只碰本关概念**，不掺干扰项；有真依赖才复用前序关（见 spec `dep:`）。
- 测试走 mock LLM（确定性）；`run.ts` 才碰真 API。
