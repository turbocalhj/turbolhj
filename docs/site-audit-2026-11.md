# 个人站优化体检（2026-11-27）

## 任务要求

### 用户原始 QUERY
> 帮我看看这个网站还有什么可以优化的

### 明确调整
无

### 需求清单
- r1（must/content）：基于当前 `E:\Mywebsite` 站点的真实代码与产物，找出「还可以优化」的具体问题，而不是泛泛而谈。
- r2（must/content）：每条问题要有可核对的位置（文件:行号或产物路径）与影响判断。
- r3（must/delivery）：给出优先级与可执行的修改方向，便于直接落地。
- r4（ideal/delivery）：覆盖性能、SEO、无障碍、代码质量、安全与内容体验多个维度，不遗漏明显短板。

## 环境理解

- 站点为纯 Node ESM 构建的静态站：`build.js` 两遍渲染 → `dist/` 153 个 HTML / 522 个文件；React 岛屿仅知识库/游戏/电竞使用。
- 当前构建通过：18.3s，93 篇笔记、1321 条双链 0 未解析；`npm run check` 扫描 153 页 18290 条链接全部可达。
- 部署目标：`https://turbocalhj.github.io`（`data/profile.json` 的 siteUrl），也可自托管 `serve.js` / `server/index.js`。
- 关键资产体积：NotoSansSC 子集 2.0MB、hero.mp4 1.7MB、search-index.json 1.34MB（br 295KB）、islands.js 235KB（br 62KB）、app.css 82KB（br 13KB）。
- 已确认页面统一输出 `<title>TURBO SPARK</title>`，`title` 参数只用于 og:title。
- 对比度实测：`--faint` 在暗色 4.03:1、亮色 3.09:1；`--accent` 亮色 4.36:1。均低于常规文本 4.5:1。

## 规划及进度

### 当前计划
- [x] P0：标题模板、320px 顶栏、游戏页工具条、笔记宽表格（320px Java 页 scrollWidth 320，工具右边界 308）
- [x] P1 可访问性：对比度令牌、触控目标 36px、搜索焦点陷阱、主题按钮动态 aria-label、知识库重复 h1
- [x] P1 性能：字体 2018KB→476KB、岛屿 235KB→26KB、移动端不下视频、SW 重写、404/lastmod
- [x] P3 服务端：CORS 只开公开接口、注册开关与首管理员口令、搜索限流、异步 scrypt
- [x] 全站回归：构建 525 文件、154 页 18310 条链接全通、浏览器无报错

### 未解决项与下一步
- 未做：搜索索引仍是 1.34MB 单文件（拆分/压缩性价比待评估）；hero.mp4 源文件本身截断（ffmpeg 报 partial file），未重编码，仅改为按视口懒加载；动效双注册合并（P3-1）、CSP 头（P3-7）、构建并发（P3-3）、README Node 版本（P3-8）仍待处理；OG 图 jpg 兜底与 BreadcrumbList 未做。

## 关键证据及证据分析

- `src/site/layout.js:66` `<title>${escapeHtml(ctx.profile.site.title)}</title>` 忽略传入的 `title`；153 个页面标题完全相同。
- `src/site/layout.js:99` 只 preload Urbanist；NotoSansSC 2MB 无 `unicode-range`，每页都整包下载。
- `src/static/sw.js:5-16` 安装阶段 `cache.addAll` 强制缓存 2MB 字体 + 1.34MB 搜索索引。
- `build.js:475-497` 为所有文本产物生成 .br/.gz，静态托管（GitHub Pages）不会按该约定协商返回。
- `src/client/app.js:325-340` 与 `src/client/layers/motion.js` 都注册滚动揭示，选择器重叠。
- `server/index.js:263-276` 首个注册用户自动成为 admin；`json()` 对所有接口回 `Access-Control-Allow-Origin: *`。

浏览器实测（本机 Chrome headless，320/375/1440px）：
- 首页首次访问 17 个请求 4,072,469B：hero.mp4 1,669KB（1920×1080）+ NotoSansSC 2,019KB。
- 320px：`.topbar-inner` 内容宽 357（可视 320），`.tools` 右边界 357，主题按钮完全在屏外；截图 `topbar320.png` 可见。
- 320px 游戏页 `.game-view-switch` 右边界 364；375px 游戏页 scrollWidth 379。
- 320px Java 笔记页 scrollWidth 374（可横向拖动），来源为正文宽表格（thead 333）。
- Java 笔记页 9,485 个元素、页高 173,528px；CLS 0.0005、FCP 540ms、DCL 479ms（localhost）。
- 搜索面板打开后连按 12 次 Tab，焦点逃到遮罩外 `.search-btn`；Esc 后正确归还 `#search-open`。
- reduced-motion 上下文下 hero 视频仍 `paused=false`（currentTime 1.22s）。
- 知识库页存在两个 `<h1>`（页头「知识库」与正文「知识库总览」）。

实施后实测（同口径）：
- 移动端首页首屏 783,524B（16 请求），hero.mp4 请求数 0；桌面端仍加载原片（1.67MB）。
- 字体 485,908B（按站内 1,773 字裁剪，原 2,018KB）；岛屿 26,273B（原 234,789B）。
- 320px：首页/知识库/游戏/Java 页 scrollWidth 均等于 320；工具区右边界 308。
- 搜索面板连按 14 次 Tab 焦点仍在 overlay 内，Esc 后回到 `#search-open`。
- 对比度：faint 暗 5.69 / 亮 4.80；亮色 accent 5.07。页脚链接高 36px，主题按钮 36×36。
- SW 缓存桶 `turbo-spark-0cb4243981`（构建 id 注入），预缓存仅 5 个文件。
- 404 页：`/nope` 返回 404 与自定义页「这页没有档案」，title「页面未找到 · TURBO SPARK」。
- 服务端：`/api/health` 有 ACAO、`/api/auth/me` 无 ACAO；`ALLOW_REGISTER=0` 时注册 403；搜索第 61 次 429。
- 知识库/游戏岛屿在 Preact 下正常：筛选 19→2 分区，列表视图 `game-grid--list`。

## 工具使用与问题反馈

- 环境 Node v22.22.3（README 写 24，版本与实际不一致，属于文档偏差）。
- 本轮测试期间启动的后台 `node serve.js` 残留占用 5173，导致用户 `npm run dev` 报 `EADDRINUSE`；已 taskkill 并释放端口。以后测试起服务用临时端口（如 `PORT=5180`），结束即 kill，不留在默认端口。

## 中间产物与文档

- 本文件：体检记录与结论。
- `docs/site-audit-2026-11.html`：交付的体检报告（28 项问题、优先级、最小修复代码）。
- `docs/site-audit-2026-11.md`：本文件。
- `C:\Users\Administrator\AppData\Local\Temp\pwtest\`：实测脚本与截图（临时目录，不交付）。