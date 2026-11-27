---
name: turbospark-parallel-git
description: 用 git worktree + 多 agent 并行开发 TURBO SPARK 的可拆分需求，并完成分支提交、推送、--no-ff 合并与清理。当需求包含多个互不依赖的页面/模块/技能，或用户要求「拉分支、多个 agent 协作」时使用。
---

# 多 agent 并行与 git 流

## 红线

1. 可拆分的开发不在 main 上直接堆改动：一模块一分支，conventional commits，推送后 `--no-ff` 合并。
2. 有复用价值的流程同时沉淀为 `.trae/skills/<name>/SKILL.md`，随分支一起提交。

## 0. 前置：main 必须干净

worktree 只包含**已提交**内容；main 有未提交改动时，agent 看不到。

```powershell
git status --short
git switch -c feat/<scope>   # 若主工作区有本轮改动，先在本分支提交
```

## 1. 拆分任务

- 按**文件所有权**拆，不按功能名词拆：同一文件（`layout.js`、`pages.js`、`build.js`、`app.css`）只能有一个 agent 改。
- 共享入口（导航、构建注册、全局样式）由集成者最后一并修改，或指定唯一负责人。
- 可并行的典型切分：新页面（data + page + 独立 layer）、纯 CSS 图层、后端 API、文档/skill。
- 每个 agent 的验收命令固定：`node build.js` + `npm run check`。

## 2. 建 worktree（Windows）

放在仓库外，避免污染工作区：

```powershell
$root = "E:\Mywebsite"
$wt   = "E:\Mywebsite-worktrees\acg"
git worktree add -b feat/acg $wt main
New-Item -ItemType Junction -Path "$wt\node_modules" -Target "$root\node_modules"
```

要点：

- 每个 worktree 一个独立分支，端口错开（5173/5174/8787+）。
- 不复制 `dist/`、`data/accounts.json`、`.env`；构建会在各自 worktree 生成 `dist/`。
- 需要未提交的本地数据时先提交到分支，或显式复制（注意隐私文件）。

## 3. 给 agent 的任务书

必须包含：

- 目标与不做什么（禁止改共享文件、禁止提交/推送）。
- 可改文件清单与可参考的现有实现。
- 复用的设计令牌/组件（`turbospark-ui-layer`）。
- 验证命令与预期（构建静默、check 全绿）。
- 提交信息格式；完成后报告改动文件、验证结果、遗留风险。

## 4. 集成与合并

先在 agent 分支提交：

```powershell
git add <files>
git commit -m "feat(scope): <说明>"
```

回到主工作区按低冲突优先合并：

```powershell
git switch main
git merge --no-ff feat/acg -m "merge: 合并 ACG 分区"
node build.js
npm run check
```

冲突处理：共享文件（layout/pages/build）以主分支为底，手工并入各分支的增量，随后重新构建验证。

## 5. 一次推送

网络慢时把所有分支和 main 一次推完：

```powershell
git push origin feat/acg feat/index feat/auth main
```

慢网络下命令会转后台，等完成通知，不要重复推送。

## 6. 清理

```powershell
git worktree remove E:\Mywebsite-worktrees\acg
git worktree prune
```

- 已合并分支可保留作记录；确认不再需要再删。
- 删除 worktree 前先结束该目录里的服务，Windows 下 `node_modules` junction 需先移除（`cmd /c rmdir "$wt\node_modules"`）。

## 检查清单

- [ ] main 起点干净，分支各自可独立构建
- [ ] 没有两个 agent 改同一文件
- [ ] 每个分支都有 `node build.js` + `npm run check` 证据
- [ ] 合并后 main 再跑一次构建与审计
- [ ] 分支、main 都已推送；worktree 已清理
- [ ] 可复用流程已写入 `.trae/skills/`
