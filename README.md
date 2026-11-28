# TURBO SPARK · 个人站点

一个把工程实践整理成网站的个人项目：项目档案记录交付过程与工程决策，知识库沉淀技术主线与方法，游戏与电竞作为兴趣旁支。整站静态生成、离线可用，构建产物 156 个 HTML 页面。

它同时也是我对「内容如何变成产品」的一次完整实践——从解析、渲染、检索，到主题、动效、部署与发布流程，全部自己实现。

## 这个站体现的技术能力

| 能力 | 具体实现 |
|---|---|
| 内容工程 | 自建 Markdown 管线：frontmatter、`[[双链]]` 四级回退解析、代码块占位防误解析、标题锚点 slug 与重名去重 |
| 构建系统 | 两遍渲染：第一遍收集标题锚点，第二遍校验跨页链接；无效锚点自动降级并写入构建报告，不留静默死链 |
| 质量保障 | 自写链接审计脚本，扫描全部产物页面的内链、页内锚点与静态资产；资源 URL 按内容哈希刷新缓存 |
| 前端架构 | 主体零框架，筛选类交互用 React 19 增量岛屿；原生 CSS 设计令牌、明暗主题、响应式与 View Transition |
| 服务与接口 | 零依赖 Node `http` 服务：MIME、ETag、Brotli/gzip 协商、缓存策略、路径越界防护；可选账号后台含 scrypt 密码、HMAC 会话与限流 |
| 数据与离线 | GitHub 元数据与内容模型全部落成 JSON 快照，断网可复现同一份站点；Service Worker 提供离线回退 |
| 工程流程 | SemVer、CHANGELOG、annotated tag、开发日志与可复用技能文档，功能按分支开发并 `--no-ff` 合并 |

## 技术栈

| 层 | 选用 | 说明 |
|---|---|---|
| 运行时与构建 | Node.js 24（ESM）、esbuild | 纯 Node 脚本两遍渲染；esbuild 把 React 岛屿打成 `islands.js` |
| Markdown 管线 | marked、marked-highlight、highlight.js、js-yaml | frontmatter、双链、代码块、表格与标题锚点 |
| 前端 | React 19 增量岛屿、原生 ES Modules | 只有筛选与列表交互挂 React，其余零框架 |
| 样式 | 原生 CSS 设计令牌、明暗主题、响应式 | 无 UI 框架；Noto Sans SC / Urbanist / JetBrains Mono 自托管 |
| 浏览器能力 | View Transitions、IntersectionObserver、Canvas 2D、Service Worker + Cache API | 转场、滚动揭示、粒子背景、离线缓存 |
| 数据 | JSON 快照（仓库、游戏、电竞、友链、内容模型） | 全部构建期读取，断网可复现 |
| 服务 | 零依赖 Node `http` 服务器 | MIME / ETag / 压缩协商 / 缓存 / 路径防护 |
| 部署 | 静态托管或自托管 | `siteUrl` 可配置，sitemap、canonical、RSS 自动生成 |

一句话概括：**构建期干重活，浏览器只跑必要交互，数据全部本地快照。**

## 知识库覆盖面

知识库以「技术主线 + 项目过程档案」双线组织，当前 18 个分区、93 篇技术记录、1,418 个标题、1,321 条双链：

- **语言与语法**：Java、Python、TypeScript、Go 的类型系统、并发模型与常见陷阱。
- **后端服务**：接口设计、鉴权、事务、缓存与 Spring Boot 服务端实践。
- **框架对照**：Spring、Flask、FastAPI 等框架的用法差异与选型依据。
- **数据库**：MySQL 索引与事务、Redis 缓存策略、MongoDB 建模清单。
- **计算机基础**：计算机网络、操作系统与面试概念的结构化梳理。
- **DevOps**：Linux、Docker、Git 与 CI/CD 工具链的日常操作与排障。
- **大数据**：Flink、Kafka、Hive 组成的实时与离线数据处理链路。
- **智能体工程**：LLM、RAG 与 Agent 的工程化笔记。
- **方法与复盘**：学习方法、项目复盘与长期积累。
- **项目过程档案**：短链服务、网约车监控、算力调度、PLM 集成、动力微服务、数据分析等项目的需求、实现与取舍。

每条技术记录都带标签与别名，主题之间用双链互指；项目档案与技术记录互相反链，避免项目与笔记混成一团。

## 实现历程

- **v1.0 基线**：搭起 P3R 视觉体系、进入封面、双链知识库、项目档案、游戏库、电竞与友链；完成两遍构建、搜索索引、RSS、sitemap 与 PWA。
- **v1.1.0 平台化**：加入零依赖账号体系与后台（注册登录、留言收件箱、配置更新、触发重建）；导航改为单行悬浮分组与移动抽屉；新增 ACG 分区与 GitHub 式项目索引；主题跟随系统并用 View Transition 切换；字体子集化把 2.0 MB 压到 486 KB。
- **v1.1.1 视觉校准**：修复浅色主题下首页玻璃卡白字白底，明确「深色主视觉上的卡片固定深色」这条约束。
- **v1.2.0 背景重构**：把首页背景视频换成从视频中提取的 1920×1080 关键帧，全站固定背景；首页完整清晰，内页统一模糊压暗，明暗主题各有一套蒙版。

每次合并都记录在 [开发日志](docs/devlog.md)，正式版本在 [CHANGELOG](CHANGELOG.md) 中按 SemVer 归档并打 tag。

## 构建与运行

```bash
npm install
npm run dev        # 构建 + 本地服务 → http://localhost:5173
```

| 命令 | 作用 |
|---|---|
| `npm run build` | 生成 `dist/`，输出统计与失效锚点报告 |
| `npm run serve` | 只起静态服务器（零依赖） |
| `npm run check` | 审计全部产物的内链、页内锚点与静态资产 |
| `npm run refresh` | 重新抓取 GitHub 元数据与 README 快照 |
| `npm run api` | 可选：启动账号与后台接口（8787） |

当前 `npm run check` 覆盖 156 个页面、21,017 条链接，全部可达。

## 目录结构

```
build.js              构建编排：两遍渲染、搜索索引、SEO、预压缩与产物统计
serve.js              零依赖静态服务器（MIME / ETag / 压缩 / 缓存 / 路径防护）
src/core/vault.js     内容扫描、frontmatter 解析与双链索引
src/core/privacy.js   公开前的内容审查与替换
src/core/markdown.js  渲染管线：占位屏蔽 → 双链 → marked → 锚点校验 → 图片懒加载
src/site/layout.js    HTML 外壳、导航、TOC、搜索面板与 SEO 元信息
src/site/pages.js     首页、知识库、项目、游戏库、电竞、友链、关于等页面
src/client/           全站样式与交互脚本（设计令牌、明暗主题、搜索、粒子、PWA）
src/islands/          React 岛屿：知识库 / 游戏库 / 电竞
src/static/           manifest 与 Service Worker
server/               可选后端：静态托管 + 账号 / 统计 / 留言接口
data/                 内容模型与公开数据快照
scripts/              抓取与链接审计脚本
dist/                 构建产物（已 gitignore）
```

## 文档

| 文档 | 内容 |
|---|---|
| [`docs/api.md`](docs/api.md) | 账号、后台与公开接口：字段、状态码、限流与示例 |
| [`docs/devlog.md`](docs/devlog.md) | 开发日志：每次合并的改动、决策与验证 |
| [`CHANGELOG.md`](CHANGELOG.md) | 版本迭代记录（SemVer + git tag） |
| [`.trae/skills/`](.trae/skills/) | 可复用流程：发布、图层 UI、内容管线、账号后台、并行 git、文档版本 |

## 素材与版权

版式参考开源个人站 [imsyy/home](https://github.com/imsyy/home) 的结构，主题与素材取自 [Persona 3 Reload 官网](https://asia.sega.com/p3r/cht/)。Persona 3 Reload 的视觉素材版权归 ATLUS / SEGA 所有，本站仅作个人非商业展示，与官方无关。
