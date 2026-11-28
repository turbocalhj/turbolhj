---
name: turbospark-content-modules
description: 为 TURBO SPARK 增加内容模块：学习教程分页、游戏成就图片墙、Liquipedia 电竞选手/海报、账号导航与后台入口、构建性能优化。当用户要求新增教程/成就/电竞数据/登录入口时使用。
---

# 内容模块接入规范

> 图层路径约定：`base/`、`effects/`、`modules/`、`pages/`、`account/`，新建图层必须放进对应分类。

## 学习教程（tutorials）

- 数据：`data/tutorials.json`，`pageSize: 12`；`scripts/gen-tutorials.js` 可重建 120 条（20 方向 × 6 阶段）。
- 页面：`pages.js` 的 `tutorialsPage(ctx, page)`；`build.js` 生成 `tutorials/index.html` 与 `tutorials/page/2..10.html`。
- 首页：`reloadPage` 渲染 `.home-tutorials` 区块，取前 12 条，参照 blog.ayeez.cn：3 列 × 4 行、最大 1000px 居中。
- 样式：`modules/tutorials.css` 卡片 = 封面 180px + 标题 18px + 摘要 13px + 底部难度/时长；分类色 `--tc` 渐变封面；`modules/tutorials-reveal.js` 负责滚动渐入（reduced-motion 时直接显示）。

## 游戏成就（achievements）

- 数据：`data/achievements.json`（games + items）；图片目录 `src/static/achievements/`，构建时复制到 `dist/assets/achievements`。
- 页面：`pages.js` 的 `achievementsPage(ctx)`，`build.js` 写 `achievements/index.html`。
- 交互：`src/client/layers/modules/achievements.js` 按 `data-game` 切换 `hidden`；`modules/achievements.css` 负责 16:9 封面、稀有度徽章与响应式网格。
- 导航：放在「私密」下拉的 `children` 中，避免一级导航过长。
- `image` 为空时用游戏色渐变占位，用户后续把截图放进目录并填 `assets/achievements/文件名`。

## 电竞（Liquipedia）

- 抓取：`scripts/fetch-liquipedia.js`
  - API 必须带 `User-Agent` 与 gzip（`Accept-Encoding: gzip`），否则 406；
  - 每次请求间隔 1.2s；遇到 429 保留人工核对兜底值，不中断；
  - 输出 `data/esports-liquipedia.json`（titles / players / posters）。
- 合并：`build.js` 把 liquipedia 的 titles/players/posters 合入 `ctx.esports`，按 key 去重。
- 渲染：`src/islands/esports.jsx` 增加 `.player-grid` 与 `.poster-grid`；样式在 `src/client/layers/modules/esports-liquipedia.css`。
- 版权：只保存公开 Infobox 字段与外链；海报用 CSS 渐变绘制、链接回 Liquipedia，不直接下载官方图片。
- 补充战队：`scripts/enrich-esports.js` 只追加不覆盖。

## 账号导航与后台

- `layout.js` 在 GitHub 后输出 `data-auth-login`（登录）与 `data-auth-admin`（后台，默认 `hidden`）。
- `src/client/layers/account/auth-nav.js` 请求 `/api/auth/me`：管理员显示后台、隐藏登录；未登录保持默认；静态服务器无 API 时静默失败。
- `server/index.js` 默认端口 5173，带 `/api/auth/*` 与 `/api/admin/*`；`npm run dev` 现在等于 build + server（含 API），纯静态用 `npm run dev:static`。
- 登录/注册页已由 `authPage` 生成；后台页由 `adminPage` 生成，前端 `auth.js` / `admin.js` 处理表单与接口。

## 构建性能

- `build.js` 用 `esbuild.transformSync` 压缩 `app.css`、`app.js`、`auth.js`、`admin.js` 与所有 layers CSS/JS。
- `src/client/layers/base/perf.css`：教程/成就/海报卡片 `content-visibility: auto`，移动端降低流光 blur。
- 已有优化保持不变：字体 preload、背景图 `fetchpriority=high`、静态资源 immutable 缓存、br/gz 预压缩。

## 验证

- `node build.js && npm run check`。
- 无头 Chrome 检查：首页 `.tutorial-card` = 12、`.home-motto p` = 3；`/tutorials/` = 12 卡；`/achievements/` = 12 卡 + 5 tab；`/esports/` = 32 选手 + 15 海报 + 24 队伍；`overflowX = 0`、无 JS 异常。
- 验证前清 Service Worker；用 `npm run dev`（5173）才能测试账号 API。