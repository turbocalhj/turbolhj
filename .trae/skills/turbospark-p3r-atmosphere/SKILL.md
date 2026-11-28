---
name: turbospark-p3r-atmosphere
description: 为 TURBO SPARK 增加 P3R 主题氛围层：通栏低留白布局、蓝色准星自定义光标、随主题变化的动态流光。当用户要求「导航栏两侧空白太大」「参照 blog.ayeez.cn 的布局」「鼠标指针变成准星」「背景动态流光」时使用。
---

# P3R 氛围层（通栏 / 准星 / 流光）

## 原则

1. 三项能力全部作为 `src/client/layers/*` 新增文件，构建时自动注入全站；不改 `app.css` / `layout.js` / `pages.js`。
2. 颜色只取现有令牌 `--accent` / `--accent-soft`，不引入第二套色板。
3. 装饰层绝不接管点击、输入或焦点；输入框、文本域保留原生光标。
4. 准星必须同时满足 `(hover: hover) and (pointer: fine)` 且非 `prefers-reduced-motion`；触摸设备不隐藏原生指针。

## 通栏布局（wide-layout.css）

- 桌面端顶栏、页脚、移动抽屉 `width: 100%; max-width: none; padding-inline: clamp(24px, 3.2vw, 64px)`，与内容区左边缘对齐。
- `:root { --w: 1480px }` 只放在 `@media (min-width: 901px)`，避免影响移动端。
- `.page` 1480；带侧栏页 1560；带 TOC 页 1440；统一 `calc(100% - 64px)` 上限。
- 901–1180 收紧 `.nav-link` 内边距、隐藏 `.brand-sub`；1600+ 再拉开导航间距。
- 首页 hero / 首页分区用 `--w` 计算留白，会随变量一起变宽，无需额外覆盖。

## 准星光标（p3r-cursor.css/js）

- 外层 `.ts-cursor` 必须是 0×0 的 `position: fixed` 定位点，只负责 `translate3d(clientX, clientY, 0)`；内层 `.ts-cursor-box` 为 36×36、`left: -18px; top: -18px`，缩放只作用于内层，中心永远等于鼠标坐标。
- **禁止 rAF + lerp 跟随**：lerp 0.32 会明显滞后，用户会看到「鼠标在这里、准星在那里」。在 `pointermove` 中即时写 `transform`。
- hover 只做 1.2 倍缩放，**不要旋转**；旋转会让四角框看起来位移。`is-hot` 只对真正的交互元素（`a` / `button` / `input` 等）生效，不要把 `.card` / `.panel` 这类大块内容算进去。
- 输入框 / textarea / contenteditable 用 `cursor: auto` 例外；触摸与 reduced-motion 直接 return，不加 `ts-cursor-on`。
- `pointermove` 需过滤 `pointerType`，只接受 mouse / pen；窗口失焦或移出视口时移除可见态。

## 动态流光（p3r-flow.css/js）

- JS 注入 `.ts-flow`：`.ts-flow-glow` + 3 × `.ts-flow-beam` + `.ts-flow-sweep` + `.ts-flow-scan`；`position: fixed; inset: 0; z-index: 4; pointer-events: none`。
- **不要用 `z-index: -1`**：首页 `.home-hero` 有多层暗色蒙版，会把流光压到完全不可见。放在内容上层（4）再用低透明度控制可读性，顶栏 z-index 900 仍在其上。
- 必须有**常驻光晕** `.ts-flow-glow`（多个 radial-gradient + blur + 缓慢漂移），否则光束扫出视口的时段画面里没有任何流光。
- beam：窄光束（16–32vw）+ `rotate(-12deg) translate3d(0 → 180vw)`，13/18/24s 错峰；sweep 9s 从 -30% 扫到 110%；scan 为 1px/4px 的极淡横纹。
- 首页不降透明度；`body:not(.section-home) .ts-flow` 收敛到 0.32；浅色主题 0.24 / 内页 0.12，光晕与光束用 `mix-blend-mode: multiply`。
- 只动画 `transform` / `opacity`；reduced-motion 关闭动画，但保留可见的静态光晕（opacity 0.55），不能直接隐藏。

## 文字载入（text-reveal.js）

- 入口标题与 `.home-name` 按字符拆成 `<span class="entry-ch|hero-ch" style="--i:n">`，CSS 用 `animation-delay: calc(var(--i) * …)` 逐字浮入；三行简介在 `body.is-hero-in` 后逐字打字。
- **动画起始必须晚于 entry-frame 淡入**（约 0.55s 后），否则字符会在封面还黑着时播完，用户看不到。
- JS 必须保留 `aria-label`、拆分失败回退原文；`prefers-reduced-motion` 直接 return。
- 验证要按时间采样每个 `.entry-ch` 的 computed opacity（例如 420/840/1260/1680ms），不能只看最终全为 1。

## 验证

- `node build.js && npm run check`。
- 无头 Chrome 取：`.topbar-inner` 宽度应等于 `innerWidth`；`.page` 宽度符合预期；`scrollWidth - innerWidth === 0`；`.ts-flow` 1、光束 3、`.ts-cursor` 1 且 `is-visible`。
- **流光必须截图并做视觉确认**（可用 analyzeImage）：只看 DOM 挂载和 computed z-index 不够，必须确认画面里真的能看到光晕/光带，且文字仍可读。
- 至少覆盖 1920 / 1440 / 390 三档与暗/明两套主题；验证前清 Service Worker，避免旧 CSS 干扰。