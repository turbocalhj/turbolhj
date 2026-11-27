# Changelog

本项目从 v1.1.0 起遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/) 与 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)；正式版本在合并 main 后打 `vX.Y.Z` tag。

## [1.1.1] - 2026-11-27

### Fixed

- 浅色主题下首页时钟与站点入口玻璃卡被反转为浅色底，白字几乎不可读；现固定为深色玻璃，主视觉上的信息在明暗主题下都清晰。

## [1.1.0] - 2026-11-27

### Added

- 账号体系：注册、登录、登出、会话 Cookie、管理员/普通用户角色。
- 后台管理：站点统计、留言收件箱、配置更新、触发重建与日志轮询。
- ACG 分区：无职转生、赛博朋克：边缘行者、艾尔登法环、Re:Zero。
- 私密入口：导航悬浮分组 + `/private.html` 汇页，收纳游戏库与电竞。
- 首页 NOW 状态带与公告卡（更新日志 / GitHub / RSS）。
- 项目索引改为 GitHub 仓库列表式：语言色点、提交数、更新时间、技术标签。
- 移动端全屏导航抽屉；`更新`、`友链`、`GitHub` 导航入口。
- 工程文档：`docs/api.md`、`docs/devlog.md`、`CHANGELOG.md`。
- 5 个项目 skill：release、ui-layer、content-pipeline、auth-admin、parallel-git。

### Changed

- 主题默认跟随系统明暗；浅色主题重新标定对比度；切换改为圆形 View Transition。
- 导航改为单行右对齐布局；当前项使用蓝色辉光下划线。
- 构建成功时完全静默；资源 URL 自动附带内容哈希 `?v=`。
- 中文字体子集化：2.0 MB → 486 KB；Service Worker 缓存版本同步。
- 页脚显示当前版本号。

### Fixed

- 浏览器标签页标题恢复为干净的 `TURBO SPARK`，不再拼接页面名。
- 链接审计支持忽略 `?v=` 查询串，不再误报资产缺失。

### Security

- 密码 scrypt 加盐，会话 HMAC 签名，Cookie HttpOnly/SameSite=Lax。
- 写操作强制 JSON + 同源校验；注册/登录/留言按 IP 限流。
- `data/accounts.json`、`session.secret`、`inbox.jsonl` 与 `.env` 均已 gitignore。

## [1.0.0] - 基线

- P3R 视觉体系、进入封面、知识库双链、项目档案、游戏库、电竞、友链、更新公告。
- React 岛屿（知识库/游戏/电竞）、两遍构建、搜索索引、RSS、sitemap、PWA。
- 目录分层：`src/core`、`src/site`、`src/client`、`src/islands`、`src/static`、`server`。
