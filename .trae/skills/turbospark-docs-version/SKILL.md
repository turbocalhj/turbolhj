---
name: turbospark-docs-version
description: 维护 TURBO SPARK 的接口文档、开发日志与版本迭代。当新增或修改 /api 接口、完成一个功能分支、准备发布、打 tag、更新公告或需要追溯某次改动的原因时使用。
---

# 接口文档 · 开发日志 · 版本迭代

## 红线

- **改接口必须同步改 `docs/api.md`**，与代码同一个分支提交。
- **每次合并回 main 必须追加 `docs/devlog.md`**，写清改了什么、为什么、怎么验证、影响面。
- **每次正式发布必须走 SemVer**：`package.json` 版本 + `CHANGELOG.md` + 合并后打 `vX.Y.Z` tag。
- 面向用户的变更同时写 `data/updates.json`（站点 `/updates.html`）。

## 1. 接口文档（docs/api.md）

改 `server/index.js` 或 `server/lib/auth.js` 时：

1. 先读实际实现，确认方法、路径、请求字段、成功响应、错误码、限流。
2. 更新对应条目：字段表、示例 JSON、状态码。
3. 新增接口要补：认证要求、同源/JSON 约束、角色要求、限流、失败示例。
4. 禁止写入真实账号、Cookie、密钥、内网地址。
5. 文档里的示例值必须能对上代码（如 `build.status` 只能是 `idle/running/done/failed`）。

验证方式：按文档用 `curl.exe` 实打一遍（PowerShell 用临时 JSON 文件传参）。

## 2. 开发日志（docs/devlog.md）

在功能分支合并后在 main 追加，或随分支提交。模板：

```markdown
## YYYY-MM-DD · vX.Y.Z

### 模块
- 改了什么；为什么这样取舍。
- 影响面：页面/接口/数据/构建。

### 验证
- `node build.js` 结果、`npm run check` 数量、截图档位。

### 决策与取舍
- 参考了什么、放弃了什么、原因。
```

要求：

- 按时间倒序，最新在最上面；未发布内容放「待办 / 下一迭代」。
- 不写流水账，写决策与影响；失败尝试也记录，避免重复踩坑。
- 涉及接口时链接 `docs/api.md` 对应小节；涉及版本时写版本号。

## 3. 版本迭代

采用 SemVer：`MAJOR.MINOR.PATCH`。

| 变更 | 版本位 |
|---|---|
| 不兼容的接口/数据格式 | MAJOR |
| 新功能、新页面、新接口 | MINOR |
| 修复、文案、样式微调 | PATCH |

发布流程：

```powershell
git switch -c chore/release-vX.Y.Z
npm version X.Y.Z --no-git-tag-version   # 同步 package.json / lock
# 更新 CHANGELOG.md（Added / Changed / Fixed / Security）
node build.js; npm run check
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore(release): vX.Y.Z"
git switch main
git merge --no-ff chore/release-vX.Y.Z -m "merge: 发布 vX.Y.Z"
git tag -a vX.Y.Z -m "TURBO SPARK vX.Y.Z"
git push origin <branches> main vX.Y.Z
```

- tag 只在 main 合并且构建/审计通过后打；不要在功能分支打发布 tag。
- 页脚版本号由 `build.js` 读取 `package.json` 自动渲染，无需手改。
- 不兼容变更要在 CHANGELOG 的 `Changed` 里明确写「BREAKING」。

## CHANGELOG 模板

```markdown
## [X.Y.Z] - YYYY-MM-DD
### Added
### Changed
### Fixed
### Security
```

## 发布检查清单

- [ ] 接口变更已同步 `docs/api.md`，示例与实现一致
- [ ] `docs/devlog.md` 有本次条目（含验证与取舍）
- [ ] `CHANGELOG.md` 已加版本段，分类正确
- [ ] `package.json` 与 lock 版本一致，页脚显示新版本
- [ ] `node build.js` 静默通过，`npm run check` 全绿
- [ ] main 合并后打 annotated tag，并推送 tag
- [ ] 用户可见变更已写 `data/updates.json`
- [ ] 没有把账号/会话/密钥/内网信息写进文档
