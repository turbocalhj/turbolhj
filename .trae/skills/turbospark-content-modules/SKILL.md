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

- `layout.js` 输出 `data-auth-login`（登录）与登录后的 `data-auth-account` 头像块；`src/client/layers/account/auth-nav.js` 请求 `/api/auth/me`，显示头像菜单（个人中心 / 后台管理 / 退出登录），未登录保持登录入口。
- 账号中心：`pages.js` 的 `accountPage(ctx)` → `/account.html`；`src/client/layers/pages/account.js/css` 负责展示头像、昵称、邮箱、加入时间、角色，编辑昵称/简介、修改密码、退出。
- 账号接口：`GET/PUT /api/account/profile`、`POST /api/account/password`；`server/lib/auth.js` 的 `publicUser` 返回 `avatar`/`bio`，改密后会重新签发会话；管理员 `ensureAdminByEnv` 默认昵称「无根生」、头像 `/assets/avatar/wugensheng.jpg`。
- `server/index.js` 默认端口 5173，带 `/api/auth/*`、`/api/account/*` 与 `/api/admin/*`；`npm run dev` 现在等于 build + server（含 API），纯静态用 `npm run dev:static`。
- 登录/注册页由 `authPage` 生成；普通用户登录后默认进入 `/account.html`，管理员进入 `/admin.html`；后台页由 `adminPage` 生成。

## 留言板（messages）

- 页面：`pages.js` 的 `messagesPage(ctx)`，`build.js` 写 `messages/index.html`；导航放在「个人」后。
- 前端：`src/client/layers/pages/messages.js` 请求 `GET /api/messages?limit=100`、提交 `POST /api/messages`；纯 DOM + `textContent` 渲染防 XSS；含预览、字数统计、最新/最早排序。
- 服务端：`server/index.js` 的 `/api/messages`，GET 只返回 `public:true` 的条目；POST 校验昵称/留言/邮箱/网址、蜜罐 `hp`、每 IP 5 次/分钟限流，写入 `data/inbox.jsonl`；后台收件箱继续可查看/删除。
- 样式：`src/client/layers/pages/messages.css`，1000px 居中，SAY HELLO 标题 + 全站留言列表 + 留言区表单。

## 构建性能

- `build.js` 用 `esbuild.transformSync` 压缩 `app.css`、`app.js`、`auth.js`、`admin.js` 与所有 layers CSS/JS。
- `src/client/layers/base/perf.css`：教程/成就/海报卡片 `content-visibility: auto`，移动端降低流光 blur。
- 已有优化保持不变：字体 preload、背景图 `fetchpriority=high`、静态资源 immutable 缓存、br/gz 预压缩。

## 验证

- `node build.js && npm run check`。
- 无头 Chrome 检查：首页 `.tutorial-card` = 12、`.home-motto p` = 3；`/tutorials/` = 12 卡；`/achievements/` = 12 卡 + 5 tab；`/esports/` = 32 选手 + 15 海报 + 24 队伍；`overflowX = 0`、无 JS 异常。
- 验证前清 Service Worker；用 `npm run dev`（5173）才能测试账号 API。