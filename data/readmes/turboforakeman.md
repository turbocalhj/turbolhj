# 个人主页 · Obsidian 知识库 + GitHub 项目

一个跑在本地的静态个人站：把本地 Obsidian 笔记库编译成可检索的知识库，把 GitHub 仓库编译成带 README 的项目档案，两边用双链互相指认。

不依赖任何前端框架与打包器，纯 Node ESM 脚本 + 原生 HTML/CSS/JS，构建产物是 `dist/` 下的 105 个静态 HTML。

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
E:/ObsidianRES/Obsidian LHJ（只读）        api.github.com（curl）
        │                                        │
   src/vault.js 扫描 + 四级链接索引         scripts/fetch-github.js
        │                                        │
        │                                  data/github.json
        │                                  data/github-extra.json
        │                                  data/readmes/*.md   ← 离线快照
        │                                        │
        └────────────┬───────────────────────────┘
                     ▼
      src/markdown.js  渲染管线（frontmatter / 双链 / 代码块 / 标题锚点）
                     ▼
      src/pages.js + src/layout.js  页面模板与外壳
                     ▼
      build.js  两遍构建 → dist/ + assets/search-index.json
                     ▼
      serve.js  http://localhost:5173
```

`data/` 里的快照是构建输入的一部分：断网也能复现同一份站点，`npm run refresh` 才需要联网。

## 目录结构

```
build.js              构建编排：两遍渲染、搜索索引、产物统计
serve.js              本地静态服务器（MIME / no-store / 路径越界防护）
src/vault.js          Obsidian 库扫描、frontmatter 解析、双链解析索引
src/markdown.js       渲染管线：占位屏蔽 → wikilink 抽取 → marked → 锚点校验
src/layout.js         HTML 外壳、导航、TOC、搜索面板、主题内联脚本
src/pages.js          首页 / 知识库 / 笔记 / 分区清单 / 项目 / 关于
src/app.css           全站样式（设计令牌 + 明暗主题）
src/client.js         搜索、目录树筛选、TOC 滚动定位、代码复制
data/profile.json     站点内容模型：项目档案、分类、展示口径
data/github*.json     GitHub 仓库与提交/语言快照
data/readmes/         各项目 README 快照
scripts/              fetch-github.js（抓取）、check-links.js（审计）
dist/                 构建产物（已 gitignore）
```

## 站点的两遍构建

1. **第一遍**：渲染全部笔记，只收集每篇的标题 id 集合；
2. **第二遍**：正式渲染时校验 `[[笔记#小节]]` 指向的锚点是否真实存在——存在就深链，不存在就降级成跳到笔记开头并加虚线样式，同时在构建报告里列出。

这样源笔记里的陈旧锚点会主动暴露出来，而不是变成静默的死链接。目前全站 999 条双链零未解析，`npm run check` 覆盖 11926 个链接。

## Obsidian 语义的还原范围

- YAML frontmatter：`tags` / `aliases` / `仓库`（用于把项目和档案笔记对上）；
- `[[笔记]]`、`[[笔记|别名]]`、`[[笔记#小节]]`、`[[#本页小节]]`；
- 链接解析四级回退：精确路径 → 分区索引笔记 → 唯一文件名（同分区优先，再取最短路径）→ 别名表；
- 标题锚点 = 标题原文的 slug，与 Obsidian 的跳转规则一致，同篇重名标题追加 `-2`、`-3`；
- 代码块与行内代码先替换成占位 token 再解析双链，保证 `` `[[x]]` `` 这类示例不会被当成真链接。

## 视觉设计约束

参考 [Hamish Williams](https://hamishw.com/) 的暗色高级质感，同时保留中文可读性：

- **暗色优先**：默认 `color-scheme: dark`，背景用 `oklch` 低彩度暖灰，主色是单一琥珀色，用于按钮、进度线、hover 高亮；
- **几何无衬线**：Inter / SF Pro + PingFang SC / Microsoft YaHei，标题用负字距但不超过 `-0.04em`，避免中文挤压；
- **大留白 + 玻璃顶栏**：页面最大宽度 `1100px`，section 间距 `96px`，顶栏用 `backdrop-filter` 毛玻璃并随滚动固定；
- **卡片式结构**：圆角 `12px`、1px 边框、柔和阴影，hover 时轻微上浮并增强阴影；
- **动效**：缓动统一 `cubic-bezier(0.4, 0, 0.2, 1)`，首页元素有 `fade-up` 入场，阅读进度线用 CSS 滚动驱动动画实现，不引入 JS；`prefers-reduced-motion` 有兜底。

明暗主题由 `prefers-color-scheme` 决定，顶栏按钮可手动切换并写入 `localStorage`，主题在首屏渲染前由内联脚本决定，不会闪白。

## 隐私边界

Obsidian 库只读不写，`dist/`（含全部笔记正文的 HTML）已在 `.gitignore` 里，仓库里只有代码与 GitHub 公开数据的快照。想换库路径改 `data/profile.json` 的 `vault` 字段即可。

## 已知限制

- 全文搜索是自建的分节倒排（1371 个小节，构建期生成 `assets/search-index.json`），没有分词与拼音，中文按子串命中；
- 代码块复制按钮在 `http://localhost` 之外的非安全上下文会被浏览器拒绝，此时如实提示失败并退回选中；
- 站点按绝对路径 `/` 生成，子路径部署需改 `data/profile.json` 的 `basePath` 后重新构建；
- 构建清理 `dist/` 时对正在被浏览器占用的文件容忍跳过，极端情况下需要手动删一次。
