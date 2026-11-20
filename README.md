# 个人主页 · 项目档案 + Obsidian 知识库

一个跑在本地的静态个人站：把 GitHub 仓库与本地工作项目编译成带分类的项目档案，把 Obsidian 笔记库编译成可检索的知识库，两边用双链互相指认。**项目是项目，笔记是笔记**：项目页讲交付与工程决策，知识库只负责技术主线与过程记录。

页面由纯 Node ESM 脚本生成；知识库筛选、游戏库筛选与电竞面板使用 React 岛屿（esbuild 打包成 `assets/islands.js`），其余是原生 HTML/CSS/JS。构建产物是 `dist/` 下的 149 个静态 HTML，含游戏百科、电竞百科、友链页面与 PWA 离线支持。

## 快速开始

```bash
npm install
npm run dev        # 构建 + 起本地服务 → http://localhost:5173
```

单独使用：

| 命令 | 作用 |
|---|---|
| `npm run build` | 生成 `dist/`，输出统计与失效锚点报告 |
| `npm run serve` | 只起静态服务器（零依赖，`serve.js`） |
| `npm run check` | 审计产物里的每一个 `<a href>`：内链、页内锚点、静态资产 |
| `npm run refresh` | 重新抓取 GitHub 元数据与 README 快照到 `data/` |

## 技术栈

| 层 | 选用 | 说明 |
|---|---|---|
| 运行时与构建 | Node.js 24（ESM）、esbuild | 两遍渲染纯 Node 脚本；esbuild 把 React 岛屿打成 `islands.js` |
| Markdown 管线 | marked、marked-highlight、highlight.js、js-yaml | frontmatter / 双链 / 代码块 / 标题锚点 |
| 前端 | React 19（增量岛屿）、原生 ES Modules | 仅知识库筛选、游戏库、电竞面板用 React，其余零框架 |
| 样式 | 原生 CSS 设计令牌、明暗主题、响应式 | 无 UI 框架；Noto Sans SC / Urbanist / JetBrains Mono 自托管 |
| 浏览器 API | View Transitions、IntersectionObserver、Canvas 2D、Service Worker + Cache API | 页面转场、滚动揭示/数字滚动、粒子网络、离线缓存 |
| 数据 | JSON 快照（`github*.json`、`games.json`、`esports.json`、`links.json`） | 全部构建期读取，断网可复现 |
| 服务 | 零依赖 Node `http` 服务器 | MIME / ETag / Brotli+gzip 协商 / 缓存策略 / 路径越界防护 |
| 部署 | 静态托管（GitHub Pages 等）或自托管 | `siteUrl` 可配置，sitemap / canonical 自动生成 |

一句话概括：**Node 构建期干重活，浏览器只跑必要交互，数据全部是本地快照。**

## 数据流

```
本地 Obsidian 库（只读）   api.github.com（curl）   本地 JSON 内容模型
        │                       │                  │
   vault.js 扫描+四级索引   fetch-github.js    games / esports / links
        │                       │                  │
        │                  github*.json            │
        │                  readmes/*.md            │
        │                       │                  │
        └───────────┬───────────┴──────────────────┘
                    ▼
         privacy.js 构建期脱敏（公司 / 内网地址 / 私密笔记）
                    ▼
         markdown.js 渲染管线（frontmatter / 双链 / 代码块 / 锚点 / 图片懒加载）
                    ▼
         pages.js + layout.js 页面模板与外壳
                    ▼
         build.js 两遍构建 → dist/（HTML + 预压缩 .br/.gz + sitemap + manifest + sw）
                    ▼
         serve.js / 静态托管  http://localhost:5173
```

`data/` 里的快照是构建输入的一部分：断网也能复现同一份站点，`npm run refresh` 才需要联网。本地工作项目只读取技术事实（模块、栈、代码量、难点），不复制源码与业务数据。

## 目录结构

```
build.js              构建编排：两遍渲染、搜索索引、SEO/预压缩、产物统计
serve.js              零依赖静态服务器（MIME / ETag / Brotli+gzip / 缓存策略 / 路径防护）
src/vault.js          Obsidian 库扫描、frontmatter 解析、双链解析索引
src/privacy.js        构建期脱敏：字面规则 + 私网 IP 兜底、私密笔记判定
src/markdown.js       渲染管线：占位屏蔽 → wikilink → marked → 锚点校验 → 图片懒加载
src/layout.js         HTML 外壳、导航、TOC、搜索面板、主题/PWA/View Transition 元信息
src/pages.js          首页 / 知识库 / 笔记 / 项目 / 游戏库 / 电竞 / 友链 / 关于
src/app.css           全站样式（设计令牌 + 明暗主题 + 新页面响应式）
src/client.js         载入动画、搜索、TOC、代码复制、滚动交互、粒子、PWA 注册
src/islands/          React 岛屿：knowledge / games / esports → assets/islands.js
src/manifest.webmanifest  PWA 应用清单
src/sw.js             Service Worker：网络优先 + 离线回退
data/profile.json     站点内容模型：GitHub 展示口径、本地项目档案、脱敏规则、siteUrl
data/github*.json     GitHub 仓库与提交/语言快照
data/games.json       游戏库：16 款游戏的评分、状态与主观记录
data/esports.json     电竞：赛事体系、战队、里程碑
data/links.json       友链：开源个人站与技术资源索引
data/readmes/         各项目 README 快照
scripts/              fetch-github.js（抓取）、check-links.js（审计）
dist/                 构建产物（已 gitignore）
```

## 站点的两遍构建

1. **第一遍**：渲染全部笔记，只收集每篇的标题 id 集合；
2. **第二遍**：正式渲染时校验 `[[笔记#小节]]` 指向的锚点是否真实存在——存在就深链，不存在就降级成跳到笔记开头并加虚线样式，同时在构建报告里列出。

这样源笔记里的陈旧锚点会主动暴露出来，而不是变成静默的死链接。目前全站 1,321 条双链零未解析，`npm run check` 覆盖 18,052 个链接。

## 项目与笔记的边界

- **项目页**：GitHub 仓库（8 个）与本地工作项目（5 个）统一进入「项目」，按工作 / 个人 / 学习三类分组。工作项目只写技术栈、模块职责、关键工作与工程难点，来源是本地工作区的架构文档与代码统计。
- **知识库**：拆成「技术笔记」与「项目档案」两组。项目档案是过程记录，每个项目页再反链到对应笔记；技术笔记按语言、后端、数据库、大数据等主线排列。
- **连接方式**：项目详情页列出档案笔记与相关技术笔记；笔记页顶部显示所属项目。项目不再是笔记的别名，笔记也不再假装成项目。

## 游戏百科与电竞

- **游戏库**：`data/games.json` 收录 16 款游戏，React 岛屿提供搜索、类型/平台/状态筛选、排序与网格/列表视图；评分与游玩状态是主观记录，发行信息是公开事实。
- **电竞百科**：`data/esports.json` 按项目组织赛事体系、战队观察与时间线，可切换筛选；不编造具体比赛结果，只写公开赛制与里程碑。
- **游戏详情**：每款游戏生成独立页面，含档案信息、主观短评与同类推荐。
- **友链页**：`data/links.json` 收录本站改造时参考的开源个人站与技术资源。
- **技术博客精选**：Obsidian 库里的独立分区，8 篇权威原文摘要（Chrome / MDN / web.dev / React / Go / Rust / Flask），每篇带原文跳转链接与到现有笔记的双链，构建后自动进入知识库。

## Obsidian 语义的还原范围

- YAML frontmatter：`tags` / `aliases` / `仓库`（用于把项目和档案笔记对上）；
- `[[笔记]]`、`[[笔记|别名]]`、`[[笔记#小节]]`、`[[#本页小节]]`；
- 链接解析四级回退：精确路径 → 分区索引笔记 → 唯一文件名（同分区优先，再取最短路径）→ 别名表；
- 标题锚点 = 标题原文的 slug，与 Obsidian 的跳转规则一致，同篇重名标题追加 `-2`、`-3`；
- 代码块与行内代码先替换成占位 token 再解析双链，保证 `` `[[x]]` `` 这类示例不会被当成真链接。

## 视觉设计

版式参考 [imsyy/home](https://github.com/imsyy/home) 的「全屏壁纸 + 玻璃卡片」结构，主题与素材取自 [Persona 3 Reload 官网](https://asia.sega.com/p3r/cht/)：

- **主视觉**：官方 FV 视频做首页全屏壁纸，深海军蓝遮罩保证中文可读；下方内容区回到暗色档案风格。
- **载入动画**：仅首次访问播放的 Memento Mori 白屏 + 官方蓝潮 SVG，约 2.5 秒；点击或按键可跳过，`sessionStorage` 记忆，`prefers-reduced-motion` 直接跳过。
- **字体**：全站统一一套字体栈——Noto Sans SC 子集（中文，按站内字符裁剪）+ Urbanist（拉丁与数字），JetBrains Mono 只用于代码；全部自托管，离线构建可用。
- **玻璃质感**：顶栏、首页时钟、站点入口使用 `backdrop-filter`；离开主视觉后顶栏转为实心玻璃，避免深色条压在浅色内容上。
- **克制动效**：不放跑马灯、入场漂浮、自定义光标和页面斜切转场；只保留 hover 位移、滚动揭示/数字滚动、页尾粒子与 View Transition 轻转场，全部尊重 `prefers-reduced-motion`。
- **明暗主题**：默认暗色，顶栏按钮可切换并写入 `localStorage`，首屏渲染前由内联脚本决定，不闪白。

> Persona 3 Reload 的视觉素材版权归 ATLUS / SEGA 所有，取自其官方网站，本站仅作个人非商业展示，与官方无关。

## 隐私边界

Obsidian 库只读不写，脱敏发生在构建期，源笔记保持原样：

- `data/profile.json` 的 `privacy.rules` 按顺序做字面替换：公司全称与简称、内网私服域名、内部仓库名、第三方供应商、内部主机名、本地库路径；
- `src/privacy.js` 额外兜底私网 IP（`10/8`、`172.16/12`、`192.168/16`），统一替换为 `<内网IP>`；`127.0.0.1` 与业务无关示例保留；
- `privacy.excludeFolders` 里的目录（当前是 `社会文件`）不进入产物，指向它们的双链降级成不可点击的「私密笔记」标记，而不是死链；
- 脱敏覆盖笔记正文、标题、别名、标签、搜索索引、GitHub README 与本地项目档案；
- `dist/`（含全部笔记正文的 HTML）已在 `.gitignore` 里，仓库里只有代码、脱敏后的内容模型与 GitHub 公开数据快照。

每次构建后可以对产物做一次敏感词扫描，确认 `徐工 / XCMG / 内网 IP / 私服域名` 均为 0 命中。换库路径改 `data/profile.json` 的 `vault` 字段即可。

## 已知限制

- 全文搜索是自建的分节倒排（1,565 个小节，构建期生成 `assets/search-index.json`），没有分词与拼音，中文按子串命中；技术博客精选笔记里记录了 Rust/WASM 分词方案，尚未接入；
- 代码块复制按钮在 `http://localhost` 之外的非安全上下文会被浏览器拒绝，此时如实提示失败并退回选中；
- 站点按绝对路径 `/` 生成，子路径部署需改 `data/profile.json` 的 `basePath` 后重新构建；
- 构建清理 `dist/` 时对正在被浏览器占用的文件容忍跳过，极端情况下需要手动删一次。
