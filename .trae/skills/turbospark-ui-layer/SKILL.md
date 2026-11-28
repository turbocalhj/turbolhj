---
name: turbospark-ui-layer
description: 以「只加不减」的图层方式为 TURBO SPARK 增加视觉功能（主题、导航悬浮分组、移动抽屉、编辑式页面、GitHub 式索引、公告卡）。当用户要求美化、新增页面区块、参考其他网站、调整明暗主题或响应式布局时使用。
---

# TURBO SPARK 图层式 UI 开发

## 核心原则

1. **只加不减**：新功能优先进 `src/client/layers/<分类>/` 的新 CSS/JS，不改旧区块；确需改基座（layout/app.css/pages.js）时保持旧结构和旧内容。
2. 图层文件**自动注入全站**：`build.js` 与 `layout.js` 递归扫描 `src/client/layers/`（含子目录），自动输出 `LAYER_CSS/LAYER_JS` 并写为 `assets/layers/<分类>/<文件>`。JS 必须先判断元素存在再执行。
3. 沿用现有设计语言：深海军蓝 `--bg`、电蓝 `--accent`、Urbanist + Noto Sans SC + JetBrains Mono、纸感浅色主题；不要引入第二套色板或 UI 框架。
4. 全部尊重 `prefers-reduced-motion`；交互要能键盘操作（focus-within、Escape、aria）。

## 目录分类（layers）

| 目录 | 放什么 |
| --- | --- |
| `base/` | 全站基础布局与性能：`wide-layout`、`perf` |
| `effects/` | 动效与指针：`entry`、`text-reveal`、`motion`、`p3r-cursor`、`p3r-flow` |
| `modules/` | 内容模块：`tutorials`、`achievements`、`esports-liquipedia` |
| `pages/` | 页面专属：`acg`、`private`、`updates`、`index-table` |
| `account/` | 账号 UI：`auth-nav` |

新图层必须放进对应分类；`build.js` 与 `layout.js` 递归扫描，`dist/assets/layers/<分类>/<文件>` 自动生成。

## 主题系统

- 令牌在 `src/client/app.css` 的 `:root` 与 `html[data-theme='light']`：`--bg/--bg-soft/--panel/--card/--text/--muted/--faint/--line/--accent/--accent-soft/--shadow`。
- 首次主题由 layout 内联脚本决定：localStorage 优先，否则跟随系统；切换用 `document.startViewTransition` 从按钮扩散圆形揭示（`html.theme-switching` + `--theme-x/y`）。
- 新组件只使用令牌；补浅色时写在 `html[data-theme='light'] .your-class`，别写死颜色。
- `color-scheme` 已按主题设置；`meta[theme-color]` 由 app.js 同步。

## 导航模式

- 桌面：品牌在左，单行中文链接右对齐，末尾 GitHub 外链；当前项 = 2px 电蓝下划线 + 辉光。
- 悬浮分组（如「私密」）：`.nav-group:hover / :focus-within` 展开 `.nav-drop`；面板含 kicker、标题、英文描述、箭头。
- ≤900px：隐藏 `.nav`，显示 `#nav-toggle` 汉堡；`#nav-panel` 全屏抽屉列出全部链接，`html.nav-panel-open` 锁滚动，Esc/点链接关闭。
- 响应式断点：1120（收紧间距）、900（抽屉）、640（62px 顶栏）、560/390（索引/品牌降级）。

## 常用页面骨架

- **编辑式分区页**（参考 ACG）：大标题 hero → sticky 筛选条 → 章节列表（CSS 海报 + 信息 dl）→ 入门顺序；章节 id 供 scroll spy，`data-medium` 供筛选。
- **GitHub 式索引**：编号 / 仓库名 + 徽标 + 分类 / 简介 + 技术标签 / 语言色点 + 提交数 + 更新时间；语言色取 GitHub linguist 色值。
- **首页 NOW 带**：在玩 / 最近笔记 / 公告卡（TS 徽标 + 标题 + 摘要 + 更新日志/GitHub/RSS 胶囊）。
- **公告卡**：参考个人博客的「头像 + 公告 + 社交」，改造成本站的 TS 徽标，不搬动漫/霓虹风格。

## 全站背景（v1.2.0）

- 背景结构：`layout.js` 在 `<body>` 首个子节点输出 `.site-bg > img`（`position: fixed; inset: 0; z-index: -1`），`body` 与 `html` 不再铺底色，改由 `.site-bg` 兜底 `#040915`。
- 素材：`src/assets/global-bg.jpg`（1920×1080 JPEG，来自视频关键帧）；新增图片必须同时进 `<link rel="preload" as="image">` 与 `og:image`，并带 `?v=<assetVersion>`。
- 首页清晰、内页模糊的规则写在 `body:not(.section-home)`：
  ```css
  body:not(.section-home) .site-bg img { filter: blur(20px) brightness(0.42); transform: scale(1.08); }
  html[data-theme='light'] body:not(.section-home) .site-bg img { filter: blur(22px) brightness(1.1) saturate(0.55); opacity: 0.42; }
  ```
  模糊必须配 `scale(1.08)`，否则边缘会露出底色。
- 首页内容区要保证背景可见：区块用全宽 + `padding: max(32px, calc((100% - var(--w)) / 2))`，蒙版用半透明深色 + `backdrop-filter`，不要用不透明面板铺满。
- **明亮背景上的顶栏必须接近不透明**：首页滚动后的 `.section-home .topbar.is-solid` 用 `rgba(6,12,24,.9)`，浅色 `rgba(244,241,233,.94)`；`.66` 级别会透出亮色导致白字失效。
- 验证前清 Service Worker（`navigator.serviceWorker.getRegistrations()` + `caches.keys()`），否则看到的是旧 CSS。

## 开发步骤

1. 开分支：`git switch -c feat/<name>`。
2. 建图层：`src/client/layers/<分类>/<name>.css`（必要时 `.js`），类名统一前缀。
3. 需要新页面时：
   - `src/site/pages.js` 加 `xxxPage(ctx)`，调用 `renderPageWrap`，传 `section/bodyClass/noindex`；
   - `build.js` 引入并 `writeFile('xxx/index.html', xxxPage(ctx))`；
   - `layout.js` 的 `NAV` 加 `{ key, en, label, file }`（分组用 `children`）。
4. 数据驱动内容放 `data/*.json`，构建期读入 `ctx`。
5. 构建 + 审计 + 截图验证：
   ```powershell
   node build.js
   npm run check
   ```
   1440 / 950 / 390 三档 + 明暗两套主题；交互态用 Playwright MCP。
6. 按 git 流提交、推送、`--no-ff` 合并。

## 实现细节

- 动效只做 hover 位移、滚动揭示、View Transition；不做跑马灯、漂浮、自定义光标。
- 图片/视频封面无版权素材时用 CSS 渐变 + 网格 + 大字号排版，不热链版权图。
- 浅色主题下卡片用 `var(--card)` + 细边框 + 轻阴影，不要纯白大平面。
- **深色主视觉上的玻璃卡必须固定深色**：首页 hero 的时钟/入口卡文字写死白色，浅色主题的 `.glass` 覆盖要排除 `.section-home`，否则白字白底。
- 新图层 JS 示例守卫：
  ```js
  var nodes = document.querySelectorAll('.your-root');
  if (!nodes.length) return;
  ```
- 筛选按钮要同步 `aria-pressed`；抽屉打开后焦点移到第一个链接。

## 验收清单

- [ ] 组件在暗色/浅色都可读，无写死深色文字
- [ ] 390px 无横向溢出；菜单可开可关
- [ ] 键盘 Tab / Enter / Esc 可用
- [ ] `prefers-reduced-motion` 下无动画仍可操作
- [ ] 没有覆盖旧页面样式导致回归
