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

- JS 创建 `.ts-cursor`：4 个 `<i>` 组成四个 L 形角 + `<b>` 中心点；`html.ts-cursor-on` 负责 `cursor: none`。
- 跟随用 rAF + lerp 0.32，`transform: translate3d(x,y,0) translate(-50%,-50%)`；缩放/旋转用独立的 `scale` / `rotate` 属性，避免覆盖 JS transform。
- `is-hot`：缩放 1.45、旋转 45°、显示外圈；`is-down`：缩到 0.82。
- 输入框 / textarea / contenteditable 用 `cursor: auto` 例外；触摸与 reduced-motion 直接 return，不加 `ts-cursor-on`。
- `pointermove` 需过滤 `pointerType`，只接受 mouse / pen；window blur 时移除可见态。

## 动态流光（p3r-flow.css/js）

- JS 注入 `.ts-flow`（3 × `.ts-flow-beam` + `.ts-flow-sweep` + `.ts-flow-scan`），`position: fixed; inset: 0; z-index: -1`；DOM 追加在 `.site-bg` 之后即可叠在背景图上。
- beam：`rotate(-14deg) translate3d(0 → 200vw)` 斜扫，三束 17/23/29s 错峰、不同宽度与透明度；sweep 11s 从 -30% 扫到 110%。
- 首页 `opacity: 1`；`body:not(.section-home) .ts-flow` 收敛到 0.4；浅色主题 0.32 / 内页 0.16，beam 与扫描线用 `mix-blend-mode: multiply`。
- 只动画 `transform` / `opacity`，`filter: blur()` 控制在 26px 内；reduced-motion 关闭动画、保留一条静态光。

## 验证

- `node build.js && npm run check`。
- 无头 Chrome 取：`.topbar-inner` 宽度应等于 `innerWidth`；`.page` 宽度符合预期；`scrollWidth - innerWidth === 0`；`.ts-flow` 1、光束 3、`.ts-cursor` 1 且 `is-visible`。
- 至少覆盖 1920 / 1440 / 390 三档与暗/明两套主题；验证前清 Service Worker，避免旧 CSS 干扰。