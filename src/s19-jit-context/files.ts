// 已就位（AI 生成）· 一个 mini Express 认证项目（内存版，避免真碰文件系统），
// 外加 JIT 三件套工具：glob（看路径）/ grep（搜内容）/ read（读全文），按成本从轻到重。
// bug：登录后总跳 /admin，不管之前在哪页。真相藏在 middleware/redirect.ts。

/** 内存文件系统：路径 → 内容。 */
export const PROJECT: Record<string, string> = {
  "CLAUDE.md":
    "# 认证服务约定\n登录成功后应把用户送回他登录前想访问的页面（存在 returnTo cookie 里），" +
    "不要一律跳首页或后台。",
  "src/index.ts":
    "import express from 'express';\nimport { authRouter } from './auth/router.js';\n" +
    "const app = express();\napp.use('/auth', authRouter);\napp.listen(3000);",
  "src/auth/router.ts":
    "import { Router } from 'express';\nimport { postLoginRedirect } from '../middleware/redirect.js';\n" +
    "export const authRouter = Router();\nauthRouter.post('/login', (req, res) => {\n" +
    "  // 校验密码... 略\n  postLoginRedirect(req, res);\n});",
  "src/auth/session.ts":
    "export function createSession(userId: string) {\n  return { userId, createdAt: Date.now() };\n}",
  "src/middleware/auth.ts":
    "export function requireAuth(req, res, next) {\n  if (!req.session) return res.redirect('/login');\n  next();\n}",
  // ↓↓↓ bug 在这里：注释说要读 returnTo 送回原页面，实现却硬编码跳 /admin
  "src/middleware/redirect.ts":
    "import type { Request, Response } from 'express';\n" +
    "// 登录后跳转：应读 returnTo cookie 把用户送回原页面\n" +
    "export function postLoginRedirect(_req: Request, res: Response) {\n" +
    "  res.clearCookie('returnTo');\n  res.redirect('/admin');\n}",
  "src/routes/admin.ts": "export const adminRoutes = ['/admin', '/admin/users'];",
  "src/routes/home.ts": "export const homeRoutes = ['/', '/about'];",
  "src/utils/log.ts": "export const log = (...a: unknown[]) => console.log('[app]', ...a);",
};

/** 最便宜：按后缀模式列路径，不读内容。支持 **\/*.{ts,md} 这类。 */
export function globFiles(pattern: string): string[] {
  const m = pattern.match(/\{([^}]+)\}/);
  const exts = m ? m[1].split(",") : [pattern.replace(/.*\./, "")];
  return Object.keys(PROJECT)
    .filter((p) => exts.some((e) => p.endsWith("." + e.trim())))
    .sort();
}

export interface GrepHit {
  file: string;
  line: number;
  content: string;
}

/** 中等：按内容搜，只回命中行（不读全文）。 */
export function grepContent(pattern: string): GrepHit[] {
  const re = new RegExp(pattern);
  const hits: GrepHit[] = [];
  for (const [file, content] of Object.entries(PROJECT)) {
    content.split("\n").forEach((line, idx) => {
      if (re.test(line)) hits.push({ file, line: idx + 1, content: line.trim() });
    });
  }
  return hits;
}

/** 最贵：读整个文件进上下文。 */
export function readFileTool(path: string): string {
  const c = PROJECT[path];
  if (c === undefined) return `[错误] 文件不存在: ${path}`;
  return c;
}
