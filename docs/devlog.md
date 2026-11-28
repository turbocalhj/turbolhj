# 开发日志

> 规则：每一次合并回 main 的功能/修复/重构，都在这里追加一条；写清「改了什么、为什么、怎么验证、影响面」。
> 对外公告仍写在 `data/updates.json`（站点 `/updates.html`），本文件面向开发过程。

## 2026-11-28 · 留言板与导航细节

### 改动

- 新增 `/messages/` 留言板：SAY HELLO / MESSAGES 标题、全站留言列表（最新/最早）、留言表单（昵称、邮箱、网址、500 字内容、预览、发送、蜜罐、字数统计）。
- 服务端新增 `GET /api/messages`（只返回 `public:true`）与 `POST /api/messages`（校验、每 IP 5 次/分钟、写入 `data/inbox.jsonl`）；后台收件箱继续可查看/删除。
- 导航「个人」后新增「留言」；「个人」下拉标记由 `▾` 小字改为 5px CSS 小箭头，消除看起来像小点的问题。
- 导航项间距：桌面 `gap 8px → 2px`、内边距 `9px 13px → 8px 9px`，超宽屏 `gap 10px → 4px`。

### 原因

- 用户要求参考 blog.ayeez.cn 的留言功能，留言入口放在个人后面，并收紧导航间距、修复个人旁的小点。

### 验证

- `node build.js` 通过；`npm run check`：169 个 HTML、23,049 条链接全部可达。
- 无头 Chrome：留言页 3 条种子消息 → 表单提交后 4 条，状态「留言已发布，谢谢！」；导航顺序「…个人 | 留言 | 说说 | 更新…」；导航 `gap=2px`、`padding=8px 9px`、caret `5×5`；`overflowX=0`、无 JS 异常。
- 留言 API：GET/POST 正常，测试数据已还原。

### 影响面

- 新增留言页面/前端脚本/样式与 `/api/messages` 接口；导航只调间距与下拉箭头，现有链接不变。

## 2026-11-28 · 修正浅色主题三行简介对比度

### 改动

- `html[data-theme='light']` 下把 `.home-motto-panel` 的深色底板改为浅色磨砂（白 → 淡蓝），左侧描边改用深蓝，增加轻微阴影。
- 浅色主题文字改为深蓝（`rgba(12,38,64,.82)`），中间行用 `#0a6a9e`，去掉深色文字压在深色面板上的低对比问题。

### 原因

- 三行小字沿用深色主题面板样式，在白天主题下第一、三行几乎不可见。

### 验证

- `node build.js` 通过；`npm run check`。
- 无头 Chrome 读取 `data-theme=light`：面板背景为浅色磨砂；三行文字颜色均为深蓝；截图局部确认清晰可读，`overflowX=0`。

### 影响面

- 仅浅色主题下三行简介的外观，不影响暗色主题与结构。

## 2026-11-28 · 主页 hero 全文字逐字载入

### 改动

- `src/client/layers/effects/text-reveal.js` 的拆分范围从 `.home-name` 扩展到 `.home-hero` 内全部文本节点，共生成 237 个 `.hero-ch` 与 22 个 `.hero-word`；英文单词整体包裹，避免逐字断词。
- 排除 `.home-clock`（时间由 app.js 动态更新）、`.home-motto`（独立打字机）、`[aria-hidden="true"]`、表单/代码/脚本；移除旧的 `.home-intro > *` 整块 fade，统一由逐字动画驱动。
- `entry.css` 补充 `ts-char-in` 关键帧并调整 hero 字符延迟为 `--i * 9ms`。

### 原因

- 用户要求主页图中的所有文字都和进入封面一样逐字载入。

### 验证

- `node build.js` 通过；`npm run check`：168 个 HTML、22,672 条链接全部可达。
- 无头 Chrome：hero 237 字符、22 个单词组；首字符 0→0.84→1、中间字符 0→0.51→1、末字符约 2.2s 才开始；`.home-clock`/`.home-motto` 内均为 0 个拆分字符；按钮与统计文本完整；`overflowX=0`。

### 影响面

- 只影响首页 hero 文字动画；页面结构与样式不变。

## 2026-11-28 · layers 目录按领域规范化

### 改动

- `src/client/layers/` 的 24 个平铺文件按领域拆为 5 个目录：
  - `base/`：`wide-layout`、`perf`
  - `effects/`：`entry`、`text-reveal`、`motion`、`p3r-cursor`、`p3r-flow`
  - `modules/`：`tutorials`、`tutorials-reveal`、`achievements`、`esports-liquipedia`
  - `pages/`：`acg`、`index-table`、`private`、`updates`
  - `account/`：`auth-nav`
- `build.js` 与 `src/site/layout.js` 改为递归扫描，构建输出 `dist/assets/layers/<分类>/<文件>`，页面注入路径同步为嵌套路径。
- 同步更新 `turbospark-ui-layer`、`turbospark-content-modules`、`turbospark-p3r-atmosphere`、`turbospark-content-pipeline` 四个 skill 的目录规范。

### 原因

- 24 个图层文件平铺在一起难以判断归属与维护；按项目 `core/site/client/islands` 的领域分组方式统一整理。

### 验证

- `node build.js` 通过；`npm run check`：167 个 HTML、22,299 条链接全部可达。
- `dist/assets/layers` 下 5 个目录、24 个资源全部生成；页面引用的 24 个 `assets/layers/**` URL 全部 HTTP 200。

### 影响面

- 只改图层文件位置与加载方式，类名、样式和行为不变；后续新图层必须放进对应分类。

## 2026-11-28 · 学习教程排版对齐参考站

### 改动

- 教程网格从 4 列 P3R 大卡改为 blog.ayeez.cn 首页文章卡样式：内容区最大 1000px 居中、3 列 × 4 行、列宽 320px、卡片间距 20px。
- 卡片结构：封面 180px（分类色渐变 + 编号 + 分类标签）→ 标题 18px → 摘要 13px（最多 3 行）→ 底部难度/时长与箭头。
- 新增 `src/client/layers/tutorials-reveal.js`：滚动到视口时按参考站 row-reveal 渐入，`prefers-reduced-motion` 时直接显示。
- 首页与 `/tutorials/` 10 页共用同一套卡片与分页布局。

### 原因

- 用户明确要求学习教程排版参照 blog.ayeez.cn 首页下方文章列表；参考站 CSS 实际为 `grid-template-columns: repeat(3,1fr)`、`width:70%; max-width:1000px`、封面 `height:180px`、标题 18px、摘要 13px。

### 验证

- `node build.js` 通过；`npm run check`：167 个 HTML、22,299 条链接全部可达。
- 1440 无头 Chrome：教程网格 `1000px`、`grid-template-columns: 320px 320px 320px`、卡片 `320×358`、封面 `316×180`、12 张卡片、`overflowX=0`；截图确认 3 列卡片与参考站结构一致。

### 影响面

- 仅教程相关样式、卡片模板与一个滚动渐入图层；其他页面不变。

## 2026-11-28 · 首页排版与逐字载入修正

### 改动

- 三行简介从主标题下方移到 hero 左侧空白列，增加深色磨砂底板、左侧蓝色描边与蓝色高亮；移动端改为 intro 后的整行。
- 学习教程从 hero 下方移到「技术主线」区块之后、`home-cta` 之前。
- 导航重排为：主页 / 项目 / 知识库 / 档案库 / 友链 / ACG / 个人 / 更新，再接 GitHub / 登录 / 后台；「私密」改名「个人」，顶部「关于」移除（页脚保留）。
- 新增 `src/client/layers/text-reveal.js`：进入封面与首页标题逐字浮入，三行简介在封面揭幕后逐字打字；`prefers-reduced-motion` 跳过。

### 验证

- `node build.js` 通过；`npm run check`：167 个 HTML、22,299 条链接全部可达。
- 无头 Chrome 逐字符采样：420ms 全部 0 → 840ms 0.62/0.43/0.18 → 1260ms 约 0.9 → 1680ms 全部 1，确认逐字动画真实播放。
- 三行简介最终文本完整；面板 `x=43`、正文 `x=481` 不重叠；教程区 `y=2207` 等于技术主线底部；`overflowX=0`。

### 影响面

- 仅首页 DOM 顺序、导航配置与两个图层；其余页面结构不变。

## 2026-11-28 · 内容扩展：教程 / 成就 / 电竞 / 账号

### 改动

- 首页：新增三行简介「这里是 turbospark 的博客。 / 所念必至，所愿必成 / 这里会分享技术与生活~」，并在封面揭幕后逐行播放文字入场动画。
- 学习教程：`data/tutorials.json` 120 条，首页 12 卡（4×3），`/tutorials/` 共 10 页、每页 12 条；`scripts/gen-tutorials.js` 可重建。
- 游戏成就：新增 `/achievements/` 页面，4 个游戏筛选、12 张成就卡；图片目录 `src/static/achievements/`，数据 `data/achievements.json`；私密下拉新增「游戏成就」。
- 电竞：接入 Liquipedia，新增 Apex 与守望先锋 2，32 名职业选手、15 张赛事海报、24 支战队；`scripts/fetch-liquipedia.js` 与 `scripts/enrich-esports.js`。
- 账号：导航 GitHub 后新增「登录」，管理员登录后显示「后台」；`auth-nav.js` 读取 `/api/auth/me`；`npm run dev` 改为构建 + `server/index.js`（5173，含 API）。
- 性能：构建时用 esbuild 压缩 CSS/JS，长列表 `content-visibility`，移动端降低流光 blur。

### 原因

- 用户希望参照 blog.ayeez.cn 的进入文字动画与教程卡片模块，并补齐账号、成就、电竞内容。
- 电竞资料需要可复现的液体百科抓取流程；账号与后台沿用项目已有的零依赖认证实现。

### 验证

- `node build.js` 通过；`npm run check`：167 个 HTML、22,633 条链接全部可达。
- 无头 Chrome：首页教程卡 12 + 三行简介 3；教程页 12 卡；成就页 12 卡/5 tab；电竞页 32 选手/15 海报/24 队伍；无 JS 异常、无横向溢出。
- 账号：未登录时「登录」可见、「后台」隐藏；`/api/auth/me` 返回 `{"user":null}`。
- Liquipedia 抓取：14 名选手成功取到真实字段，其余因 429 限流保留人工核对值；脚本可重复运行。

### 影响面

- 新增数据文件、脚本与图层；`app.css` 94K → 75K，`app.js` 13K；构建页面 167 个。
- 电竞海报使用渐变占位与外链，不下载受版权保护的官方图片；成就图片由用户后续放入目录。

## 2026-11-27 · 通栏布局与 P3R 氛围层

### 改动

- 新增 `src/client/layers/wide-layout.css`：桌面端顶栏、页脚与移动抽屉改为通栏，左右留白收敛到 `clamp(24px, 3.2vw, 64px)`；`--w` 1240 → 1480，内容区随视口加宽；带侧栏页 1560、带 TOC 页 1440。
- 新增 `p3r-cursor.css` / `p3r-cursor.js`：fine pointer 设备进入站点后以蓝色四角准星替换原生指针，中心点 + 辉光，hover 可交互元素放大并旋转 45°，按下收缩；输入框保留原生光标。
- 新增 `p3r-flow.css` / `p3r-flow.js`：常驻蓝色光晕 + 三束横扫光束 + 下扫光带 + 轻扫描线，位于内容层之上（`z-index: 4`）但 `pointer-events: none`；首页完整显示，内页收敛，浅色主题切换为 multiply。
- 新增 `turbospark-p3r-atmosphere` skill，固化三项做法与验收方式。

### 修复（同日）

- 首版流光用 `z-index: -1` 放在背景图同一层，首页 hero 的多层暗色蒙版把它压到几乎不可见，实测截图里完全看不到光带。
- 改为 `z-index: 4` 的内容上层，并增加**常驻光晕**（不依赖光束扫过视口），光束宽度收窄、亮度提高；任何时刻截图都能看到蓝色流光。
- 准星光标首版用 rAF + lerp 0.32 跟随，快速移动时明显滞后，用户看到「鼠标在这里、准星在那里」；且 hover 时旋转 45° 放大到 1.45，视觉上进一步偏移。
- 改为外层 0×0 定位点 + 内层 36px 准星居中，`pointermove` 即时写 transform；hover 只做 1.2 倍缩放、不旋转，并只对真正的交互元素生效。四点实测准星中心与鼠标坐标完全一致。
- 教训：氛围层不能只验证 DOM 是否挂载，必须截图做视觉确认；`z-index:-1` 在首页多层蒙版下不可见。

### 原因

- 1920px 屏下原 `--w: 1240px` 让顶栏两侧各留 340px，视觉重心过度居中；参照 blog.ayeez.cn 的低留白布局，改为顶栏通栏 + 更宽内容区。
- 用户要求复刻参考站的准星指针与动态流光，但颜色改用本站 P3R 蓝，而不是参考站的绿色。

### 验证

- `node build.js` 退出码 0；`npm run check` 通过。
- 无头 Chrome 实测：1920 顶栏宽 1920、左右 61.44px，内容区 1480；1440 内容区两侧 32px；390 无横向溢出；暗/明两套主题均正常；`.ts-flow` 1 个、光束 3 条、`.ts-cursor` 已挂载并跟随指针。
- 流光截图经视觉模型确认：画面可见大面积蓝色光晕与亮色光束，主标题与卡片文字仍清晰可读。
- 触摸与 `prefers-reduced-motion` 下不启用准星，流光仅保留静态光。

### 影响面

- 只新增 `layers` 文件，未改 `app.css`、`layout.js`、`pages.js`、`build.js`。
- 光标与流光为纯装饰层，不接管链接、表单或焦点；`html.ts-cursor-on` 仅在 fine pointer 且非 reduced-motion 时添加。

## 2026-11-27 · v1.2.1

### 改动

- 重写 `README.md`：按「技术能力 / 技术栈 / 知识库覆盖面 / 实现历程」四块组织，替换过时数字（156 页、21,017 条链接），删除本地路径、脱敏步骤与内部命令描述。
- 站内文案：知识库、项目、关于、404、页脚、搜索占位与 RSS 标题统一改为面向内容的描述。
- `data/profile.json`：站点描述改为「工程笔记、项目档案与技术实践的个人站点」；工作项目分类与各项目公开说明改为「仅呈现什么」，不再描述脱敏过程。
- 关于页「这个站是怎么来的」由内部流水账改为公开的实现历程；项目页徽标「脱敏档案」改为「工作档案」。

### 原因

- 原描述以内部视角写成（本地库、构建期脱敏、数据来自哪个文件），公开访问者读不到有用信息，也显得像开发备忘。
- 统一文案口径后，首页、知识库、项目与 README 说的是同一件事：这个站覆盖什么、怎么组织、能提供什么。

### 验证

- `node build.js` 通过；`npm run check`：156 个 HTML、21,017 条链接全部可达。
- Playwright 1440px 截图核对知识库页与关于页，新文案排版正常、无截断。

### 影响面

- 仅文案与数据描述字段，页面结构、样式、接口未变；`privacy.rules` 保持原样。

## 2026-11-27 · v1.2.0

### 改动

- 首页删除背景视频 `.wallpaper-video` 与相关懒加载逻辑，改为全站固定背景图 `.site-bg`（`position: fixed; z-index: -1`），`body` 背景设为 `transparent`。
- 背景图取自 `hero.mp4` 4.9s 帧，1920×1080，JPEG quality 90，约 144 KB；`layout.js` 在 `<head>` 预加载并在 body 首个子节点输出，`og:image` 同步替换。
- 首页主视觉 `.home-hero` / `.wallpaper` 透明化，背景完整呈现；`.home-section`、`.home-now` 改为全宽 + 磨砂蒙版。
- 内页 `body:not(.section-home) .site-bg img` 统一 `blur(20px) brightness(.42)`，浅色主题改为浅色低饱和 + 浅色蒙版。
- 首页滚动后顶栏 `.section-home .topbar.is-solid` 由 `rgba(6,12,24,.66)` 提升到 `.9`，浅色为 `rgba(244,241,233,.94)`。

### 原因

- 背景视频体积大、移动端耗电且有自动播放限制；参考 `blog.ayeez.cn` 的固定背景做法，改成一张图即可获得稳定的视觉锚点。
- 首页需要「完整清晰」，内页需要「退到幕后」，用同一张图 + 不同滤镜实现，避免维护两套素材。
- 明亮背景上滚动时，原顶栏半透明底色不足，白字对比不够。

### 验证

- `node build.js` 退出码 0；`npm run check`：156 个 HTML、21,017 个链接全部可达。
- Playwright：1440px 首页（背景清晰 / 文案可读）、1440px 项目页暗色（模糊压暗）、1440px 浅色项目页（浅色磨砂）、390px 首页滚动到 NOW 区（顶栏实心、对比达标）。
- 旧 Service Worker 会缓存样式，验证前需 `unregister` + 清 Cache Storage，避免旧 CSS 干扰。

### 影响面

- 仅视觉层与首页 hero 结构；内容、路由、账号/后台接口未变。
- 删除 `src/assets/p3r/hero.mp4`、`hero-poster.webp`，需要旧视频可从 Git 历史恢复。

## 2026-11-27 · v1.1.1

### 修复

- 浅色主题下 `.glass` 统一被改为浅色底，但首页时钟与站点入口卡的文字是主视觉用的白色，出现白字白底。
- 修复方式：`html[data-theme='light'] .section-home .glass` 保持深色玻璃渐变，主视觉上的卡片不跟随浅色反转。

### 验证

- `node build.js` 静默通过；Playwright 1440px 浅色主题截图确认时钟/入口文字清晰。
- 未影响其他页面的浅色卡片。

## 2026-11-27 · v1.1.0

### 站点与视觉

- 主题：未手动选择时跟随系统明暗；浅色主题重标底色、文字、边框、卡片与表格；切换改为从按钮扩散的 View Transition 圆形揭示，并同步 `meta[theme-color]`。
- 导航：改为品牌在左、右侧单行链接；新增 ACG、更新、友链、GitHub；「私密」悬浮分组收纳游戏库与电竞；901–1120px 收紧间距，≤900px 改为全屏抽屉（Esc/点链接关闭、滚动锁定）。
- 首页：新增 NOW 状态带（在玩 / 最近笔记 / 公告）；公告卡改为 TS 徽标 + 标题 + 摘要 + 更新日志/GitHub/RSS 胶囊。
- ACG：新增 `/acg/`，收录无职转生、赛博朋克：边缘行者、艾尔登法环、Re:Zero；信息以官网为准，CSS 海报按作品主色生成，支持动画/游戏筛选与目录滚动高亮。
- 项目索引：从稀疏表格改为 GitHub 仓库列表式（名称、GITHUB/LOCAL、分类、简介、技术标签、语言色点、提交数、更新时间）。

### 账号与后台

- 零依赖账号体系：scrypt 加盐、HMAC 会话 Cookie、角色 `admin/user`、首个用户自动管理员、`ADMIN_*` 环境变量播种。
- 后台：站点统计、留言收件箱、配置白名单更新、触发重建与日志轮询；写操作要求 JSON + 同源，注册/登录/留言限流。
- 本地优先：静态站可托管，账号与后台需运行 `npm run api`（8787）。

### 工程

- 构建成功时完全静默，失败才输出。
- `app.css` / `app.js` / 各图层自动带 `?v=<内容哈希>`，改版不吃旧缓存；链接审计支持忽略查询串。
- 中文字体子集化（2.0 MB → 486 KB），Service Worker 缓存版本同步。
- 流程沉淀为 5 个项目 skill：release / ui-layer / content-pipeline / auth-admin / parallel-git。
- 文档：新增 `docs/api.md`、`docs/devlog.md`、`CHANGELOG.md`。

### 验证

- `node build.js`：退出码 0，无输出。
- `npm run check`：156 个 HTML、21,017 个链接，内链/锚点/资产全部可达。
- 无头 Edge + Playwright：1440 / 1024 / 950 / 390 四档，明暗主题、悬浮菜单、移动抽屉均已截图核对。

### 决策与取舍

- 参考 `blog.ayeez.cn` 只吸收导航布局、公告卡与单行链接密度；不引入绿色 HUD、动漫线稿、广告/统计脚本。
- 参考站的「说说/相册」没有内容支撑，不建空入口。
- 音乐播放器只保留目录与歌单骨架（`src/assets/audio/`、`data/music.json`），按用户要求暂缓实现。

## 2026-11-27 · v1.0.0 基线（回溯）

- P3R 视觉体系、进入封面、知识库双链、项目档案、游戏库、电竞、友链、更新公告。
- React 岛屿（知识库/游戏/电竞）、两遍构建、搜索索引、RSS、sitemap、PWA。
- 目录分层：`src/core`、`src/site`、`src/client`、`src/islands`、`src/static`、`server`。

## 待办 / 下一迭代

- 首页音乐播放器：读取 `data/music.json`，支持封面、进度、音量、上下曲。
- 后台用户管理（列表/禁用/改角色）与操作审计。
- 全文搜索分词优化（Rust/WASM 方案评估）。
