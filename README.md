# 个人主页 · 项目档案 + Obsidian 知识库

一个跑在本地的静态个人站：把 GitHub 仓库与本地工作项目编译成带分类的项目档案，把 Obsidian 笔记库编译成可检索的知识库，两边用双链互相指认。**项目是项目，笔记是笔记**：项目页讲交付与工程决策，知识库只负责技术主线与过程记录。

页面由纯 Node ESM 脚本生成，不引入前端框架；只有知识库筛选使用 React 岛屿（esbuild 打包成 `assets/islands.js`），其余是原生 HTML/CSS/JS。构建产物是 `dist/` 下的 120 个静态 HTML。

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

## 数据流

```
本地 Obsidian 库（只读）                  api.github.com（curl）
        │                                        │
   src/vault.js 扫描 + 四级链接索引         scripts/fetch-github.js
        │                                        │
        │                                  data/github.json
        │                                  data/github-extra.json
        │                                  data/readmes/*.md   ← 离线快照
        │                                        │
        │                                  data/profile.json
        │                                  ├─ localProjects  ← 本地工作项目档案
        │                                  └─ privacy        ← 脱敏与私密笔记规则
        │                                        │
        └────────────┬───────────────────────────┘
                     ▼
      src/privacy.js  构建期脱敏（公司 / 内网地址 / 私密笔记）
                     ▼
      src/markdown.js  渲染管线（frontmatter / 双链 / 代码块 / 标题锚点）
                     ▼
      src/pages.js + src/layout.js  页面模板与外壳
                     ▼
      build.js  两遍构建 → dist/ + assets/search-index.json
                     ▼
      serve.js  http://localhost:5173
```

`data/` 里的快照是构建输入的一部分：断网也能复现同一份站点，`npm run refresh` 才需要联网。本地工作项目只读取技术事实（模块、栈、代码量、难点），不复制源码与业务数据。

## 目录结构

```
build.js              构建编排：两遍渲染、搜索索引、产物统计
serve.js              本地静态服务器（MIME / no-store / 路径越界防护）
src/vault.js          Obsidian 库扫描、frontmatter 解析、双链解析索引
src/privacy.js        构建期脱敏：字面规则 + 私网 IP 兜底、私密笔记判定
src/markdown.js       渲染管线：占位屏蔽 → wikilink 抽取 → marked → 锚点校验
src/layout.js         HTML 外壳、导航、TOC、搜索面板、主题内联脚本
src/pages.js          首页 / 知识库 / 笔记 / 分区清单 / 项目 / 关于
src/app.css           全站样式（设计令牌 + 明暗主题）
src/client.js         载入动画、首页时钟、搜索、目录筛选、TOC、代码复制
src/islands/          React 岛屿：知识库筛选（knowledge.jsx → islands.js）
data/profile.json     站点内容模型：GitHub 展示口径、本地项目档案、分类、脱敏规则
data/github*.json     GitHub 仓库与提交/语言快照
data/readmes/         各项目 README 快照
scripts/              fetch-github.js（抓取）、check-links.js（审计）
dist/                 构建产物（已 gitignore）
```

## 站点的两遍构建

1. **第一遍**：渲染全部笔记，只收集每篇的标题 id 集合；
2. **第二遍**：正式渲染时校验 `[[笔记#小节]]` 指向的锚点是否真实存在——存在就深链，不存在就降级成跳到笔记开头并加虚线样式，同时在构建报告里列出。

这样源笔记里的陈旧锚点会主动暴露出来，而不是变成静默的死链接。目前全站 1,284 条双链零未解析，`npm run check` 覆盖 15,093 个链接。

## 项目与笔记的边界

- **项目页**：GitHub 仓库（8 个）与本地工作项目（5 个）统一进入「项目」，按工作 / 个人 / 学习三类分组。工作项目只写技术栈、模块职责、关键工作与工程难点，来源是本地工作区的架构文档与代码统计。
- **知识库**：拆成「技术笔记」与「项目档案」两组。项目档案是过程记录，每个项目页再反链到对应笔记；技术笔记按语言、后端、数据库、大数据等主线排列。
- **连接方式**：项目详情页列出档案笔记与相关技术笔记；笔记页顶部显示所属项目。项目不再是笔记的别名，笔记也不再假装成项目。

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
- **克制动效**：不放跑马灯、入场漂浮、自定义光标和页面斜切转场；只保留 hover 的颜色与 1–3px 位移，降低动效干扰。
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

- 全文搜索是自建的分节倒排（1,510 个小节，构建期生成 `assets/search-index.json`），没有分词与拼音，中文按子串命中；
- 代码块复制按钮在 `http://localhost` 之外的非安全上下文会被浏览器拒绝，此时如实提示失败并退回选中；
- 站点按绝对路径 `/` 生成，子路径部署需改 `data/profile.json` 的 `basePath` 后重新构建；
- 构建清理 `dist/` 时对正在被浏览器占用的文件容忍跳过，极端情况下需要手动删一次。
