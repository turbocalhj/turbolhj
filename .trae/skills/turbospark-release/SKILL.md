---
name: turbospark-release
description: 构建、审计、截图验证并发布 TURBO SPARK 静态站（e:\Mywebsite）。当修改页面/CSS/内容后需要构建验证，准备提交、推送、合并，排查构建失败、死链、资产 404 或线上缓存不更新时使用。
---

# TURBO SPARK 发布与验证

## 触发场景

- 改完页面、图层 CSS/JS、数据文件，准备交付。
- `node build.js` 报错，或 `npm run check` 报锚点/资产缺失。
- 需要本地预览、无头截图核对、或按 git 流提交推送。
- 用户问「怎么启动」「为什么线上没更新」。

## 0. 先确认分支

```powershell
git branch --show-current
git status --short
```

可拆分的开发先开分支，不在 main 上堆大改动：

```powershell
git switch -c feat/<scope>
```

## 1. 构建（成功时静默）

```powershell
node build.js
$LASTEXITCODE   # 0 即成功，成功不打印任何统计
```

构建会做：两遍渲染校验双链锚点、隐私脱敏、页面/笔记/项目/游戏/ACG、`dist/` 产物、`.br/.gz` 预压缩、sitemap/robots/feed、资源 `?v=<哈希>`。

## 2. 链接审计

```powershell
npm run check
```

期望结尾：`✓ 内链、锚点、资产全部可达`。脚本会忽略 `?v=` 查询串；若新增页面/锚点报错，先修源内容再重跑。

## 3. 本地预览

| 命令 | 地址 | 用途 |
|---|---|---|
| `node serve.js` | `http://localhost:5173/` | 纯静态，零依赖 |
| `npm run api` | `http://127.0.0.1:8787/` | 静态 + 账号/后台 API |

`npm run dev` = `node build.js && node serve.js`。账号、登录、后台只在 8787 生效。

## 4. 视觉验证（改 UI 时必做）

无头 Edge 截图（不弹窗，全新 profile 避免缓存）：

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
& $edge --headless=new --disable-gpu --hide-scrollbars --no-first-run `
  --user-data-dir="$env:TEMP\ts-shot" --window-size=1440,1000 `
  --virtual-time-budget=14000 --run-all-compositor-stages-before-draw `
  --screenshot="$env:TEMP\home.png" "http://localhost:5173/"
```

需要交互（悬浮菜单、主题切换、移动抽屉）时用 Playwright MCP；断点至少看 1440、950、390 三档。

对已打开页面做缓存穿透：

```js
document.querySelectorAll('link[rel=stylesheet]').forEach(l => { l.href = l.href.split('?')[0] + '?v=' + Date.now(); });
```

## 5. 提交 / 推送 / 合并

```powershell
git add <files>
git commit -m "feat(scope): 一句话说明"
git push -u origin <branch>
git switch main
git merge --no-ff <branch> -m "merge: <说明>"
git push origin main
```

提交类型：`feat` / `fix` / `style` / `perf` / `refactor` / `chore` / `docs`。只在用户明确要求时提交；慢网络下 push 转入后台后等通知，不要重复推。

## 检查清单

- [ ] `node build.js` 退出码 0 且无输出
- [ ] `npm run check` 全部可达
- [ ] 浅色 / 深色都看过；1440、950、390 不溢出
- [ ] 新增页面进入 sitemap；登录/后台/404 带 noindex
- [ ] 资源 URL 带 `?v=`，改版无需手动清缓存
- [ ] 没有把 `data/accounts.json`、`data/session.secret`、`dist/` 提交进去

## 常见坑

- PowerShell 5 不支持 `&&`，用 `;` 或分步执行。
- `listen EADDRINUSE :::5173`：先找 PID（`Get-NetTCPConnection -LocalPort 5173`）再结束，多为遗留 `node serve.js`。
- `dist/` 文件被浏览器占用时构建会跳过，重启服务后重建即可。
- serve.js 对非 HTML 资源缓存 1 小时；构建已用内容哈希破缓存，仍看到旧样式时先确认 `?v=` 是否变化。
- feed 摘要取 `rendered.sections` 第一段，不要引用不存在的 `rendered.plain`。
