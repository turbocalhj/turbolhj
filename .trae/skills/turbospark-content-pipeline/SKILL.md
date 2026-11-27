---
name: turbospark-content-pipeline
description: 维护 TURBO SPARK 的内容模型与构建数据管线：profile/games/esports/acg/updates/links、Obsidian 笔记与双链、脱敏、sitemap/feed/JSON-LD。当新增内容类型、批量改数据、添加页面、处理隐私脱敏或修复构建报告时使用。
---

# TURBO SPARK 内容与数据管线

## 数据文件分工

| 文件 | 作用 | 关键字段 |
|---|---|---|
| `data/profile.json` | 站点身份、项目展示口径、本地项目、分类、隐私规则、siteUrl/basePath | `site` / `person` / `projects` / `localProjects` / `privacy` |
| `data/github.json` | 仓库快照 | `name` / `description` / `language` / `pushed_at` / `html_url` |
| `data/github-extra.json` | 提交数、语言占比 | `repos[name].commits/languages` |
| `data/games.json` | 游戏库 | `name` / `slug` / `status` / `accent` / `score` |
| `data/esports.json` | 赛事、战队、里程碑 | `titles/events/teams/milestones` |
| `data/acg.json` | 四部作品档案 | `cn/sub/jp/en/medium/studio/director/date/official/accent` |
| `data/updates.json` | 更新公告 | `entries[].date/title/summary/items` |
| `data/links.json` | 友链分组 | `groups[].links[]` |
| `data/music.json` | 首页播放器预留歌单 | `tracks[]`（音频放 `src/assets/audio/`） |
| `data/readmes/*.md` | GitHub README 快照 | 由 `npm run refresh` 抓取 |

这些文件全部在构建期读取，断网可复现；改完必须 `node build.js` 验证。

## 新增一种内容/页面

1. 建 `data/<type>.json`，字段保持扁平、可读；在 `build.js` 用 `readJson()` 读取并挂到 `ctx`。
2. 在 `src/site/pages.js` 写 `xxxPage(ctx)`，统一用 `renderPageWrap`，传 `title/desc/section/bodyClass`；不想进 sitemap 就 `noindex: true`。
3. `build.js` 写页面：
   - `writeFile(path.join('xxx','index.html'), xxxPage(ctx));`
   - 详情页循环 `writeFile(path.join('xxx', slug + '.html'), ...)`。
4. `layout.js` 的 `NAV` 加条目；首页需要露出时在 `reloadPage` 加区块。
5. 新样式进 `src/client/layers/`（见 `turbospark-ui-layer`）。
6. 跑 `npm run check`，确认内链/锚点/资产。

## Obsidian 笔记管线

- `src/core/vault.js`：扫描 `profile.vault`，解析 frontmatter（`tags/aliases/仓库`），建双链索引与 `mtime`。
- `src/core/markdown.js`：占位屏蔽 → wikilink → marked → 标题锚点 → 图片懒加载；支持 `[[笔记]]`、`[[笔记|别名]]`、`[[笔记#小节]]`。
- 两遍构建：第一遍只收标题 id，第二遍校验跨笔记锚点；失效锚点降级到笔记开头，不再打印尴尬报告。
- 双链解析四级回退：精确路径 → 分区索引 → 唯一文件名 → 别名。
- feed 摘要取 `rendered.sections.find(s => s.t)?.t`，不要用不存在的 `rendered.plain`。

## 隐私与脱敏

- `data/profile.json` 的 `privacy.rules` 按顺序字面替换公司/内网/供应商/主机名/本地路径；`src/core/privacy.js` 兜底私网 IP。
- `privacy.excludeFolders` 内的目录不产出；指向它们的双链变成不可点击的「私密笔记」，不是死链。
- 脱敏覆盖正文、标题、别名、标签、搜索索引、README、本地项目档案。
- `dist/` 已在 `.gitignore`；账号/会话/留言数据也不入库。
- 改完抽查：构建产物里敏感词命中应为 0。

## SEO / 分发

- `<title>` 固定为站点名（用户要求干净标签页）；页面标题只用于 OG/JSON-LD。
- sitemap 只收 `!noindex` 页面；登录/注册/后台/404 必须 `noindex`。
- `feed.xml` 取最近 30 篇笔记；`siteUrl` 未配置时跳过 sitemap/robots。
- 知识库/项目详情有 `BlogPosting` JSON-LD；改字段时同步 `jsonLd`。

## 常见坑

- 不要整体重写 `data/profile.json`（会把紧凑 JSON 变成 400+ 行格式 diff）；只改必要字段。
- `saveProfile()` 原子写 `.tmp` + rename；后台配置接口只合并允许的字段。
- 游戏/ACG 的官方事实只写可确认信息，不确定就标「未确认」或省略。
- 新增详情页时 slug 必须与数据一致，否则项目/卡片链接 404。
- 新数据里不要放未脱敏的公司名、内网地址、账号。

## 验收

```powershell
node build.js
npm run check
```

- 笔记数/双链未解析数（应为 0）、页面数、sitemap 收录符合预期。
- 新页面在导航/首页可达，锚点可用，浅色/深色样式正常。
