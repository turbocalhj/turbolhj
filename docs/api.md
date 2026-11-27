# TURBO SPARK 接口文档

- 版本：v1.1.1
- 服务：`node server/index.js`（`npm run api`）
- 默认地址：`http://127.0.0.1:8787`
- 数据格式：请求与响应均为 `application/json; charset=utf-8`
- 维护规则：**改接口必须同步改本文档**，并在 `docs/devlog.md` 记录日期与影响面。

## 通用约定

### 认证

- 登录/注册成功后服务端下发 Cookie `ts_session`：`HttpOnly; SameSite=Lax; Max-Age=604800`，HTTPS 反代下额外 `Secure`。
- 受保护接口依靠该 Cookie 识别用户，不接受 `Authorization` 头。
- 角色：`admin`、`user`；`/api/admin/*` 仅 `admin` 可访问，其他角色返回 403。

### 写操作安全

所有 `POST/PUT` 必须同时满足：

1. `Content-Type: application/json`，否则 `415 { "error": "需要 application/json" }`；
2. 同源 `Origin`（存在时其 host 必须等于请求 host），否则 `403 { "error": "跨站请求被拒绝" }`。

### 错误格式

```json
{ "error": "人类可读的中文或英文说明" }
```

### 限流

| 范围 | 限制 |
|---|---|
| 注册 | 5 次 / 分钟 / IP |
| 登录 | 8 次 / 分钟 / IP |
| 联系表单 | 5 次 / 分钟 / IP |
| 搜索 | 60 次 / 分钟 / IP |

超限返回 `429 { "error": "操作过于频繁" }`。

---

## 公开接口

### `GET /api/health`

```json
{ "ok": true, "uptime": 128, "node": "v24.22.2" }
```

### `GET /api/stats`

读取构建生成的搜索索引统计。

```json
{ "notes": 93, "sections": 1565, "projects": 13, "builtAt": "2026-11-27T06:20:00.000Z" }
```

### `GET /api/search?q=<关键词>&limit=<1-50>`

全文分节检索；`q` 为空时返回空数组。

```json
{
  "q": "导航",
  "results": [
    { "note": "技术/前端", "title": "导航", "sec": "移动端", "href": "/knowledge/xxx.html#移动端", "text": "…" }
  ]
}
```

### `POST /api/contact`

提交留言，写入 `data/inbox.jsonl`。

```json
{ "name": "访客", "email": "a@b.com", "message": "你好" }
```

| 字段 | 必填 | 限制 |
|---|---|---|
| `name` | 是 | ≤ 60 字 |
| `email` | 否 | ≤ 120 字，需符合邮箱格式 |
| `message` | 是 | ≤ 2000 字 |

成功：`201 { "ok": true }`；缺少 name/message：`400`。

---

## 账号接口

### `GET /api/auth/me`

返回当前会话用户；未登录时 `user` 为 `null`。

```json
{
  "user": {
    "id": "1f2c…",
    "email": "a@b.com",
    "name": "阿叶",
    "role": "admin",
    "createdAt": "2026-11-27T06:00:00.000Z"
  }
}
```

### `POST /api/auth/register`

```json
{ "name": "阿叶", "email": "a@b.com", "password": "至少8位", "setupToken": "可选" }
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `email` | 是 | 唯一，邮箱格式 |
| `password` | 是 | ≥ 8 位，scrypt 加盐存储 |
| `name` | 否 | ≤ 40 字，缺省用邮箱前缀 |
| `setupToken` | 否 | 首个用户且服务端设置了 `ADMIN_SETUP_TOKEN` 时必填 |

- 首个注册用户自动 `admin`；`ADMIN_EMAIL` 对应邮箱也自动 `admin`。
- `ALLOW_REGISTER=0` 时返回 `403 { "error": "注册已关闭" }`。
- 成功：`201 { "user": { ... } }`，同时下发会话 Cookie。

### `POST /api/auth/login`

```json
{ "email": "a@b.com", "password": "至少8位" }
```

成功：`200 { "user": { ... } }` 并下发 Cookie；失败：`401 { "error": "邮箱或密码不正确" }`。

### `POST /api/auth/logout`

清 Cookie 并递增 `sessionVersion`，使该用户所有旧会话失效。

```json
{ "ok": true }
```

---

## 后台接口（admin）

### `GET /api/admin/inbox`

留言倒序，最多 200 条；`id` 为文件行号，可直接用于删除。

```json
{
  "items": [
    { "id": 12, "at": "2026-11-27T06:30:00.000Z", "name": "访客", "email": "a@b.com", "message": "你好" }
  ]
}
```

### `POST /api/admin/inbox/delete`

```json
{ "id": 12 }
```

成功 `200 { "ok": true }`；不存在 `404 { "ok": false }`。

### `GET /api/admin/stats`

```json
{
  "distFiles": 525,
  "distBytes": 15045463,
  "indexBytes": 1371957,
  "builtAt": "2026-11-27T06:20:00.000Z",
  "inbox": 0,
  "users": 1,
  "uptime": 3600,
  "build": { "status": "idle", "startedAt": null, "finishedAt": null, "code": null },
  "admin": "a@b.com"
}
```

`build.status`：`idle` / `running` / `done` / `failed`。

### `GET /api/admin/config`

```json
{
  "site": { "title": "TURBO SPARK", "tagline": "…", "description": "…" },
  "person": { "name": "…", "role": "…", "location": "…" },
  "github": "https://github.com/turbocalhj",
  "siteUrl": "https://turbocalhj.github.io"
}
```

### `PUT /api/admin/config`

只接受白名单字段，空字符串忽略；原子写回 `data/profile.json`。

```json
{
  "site": { "title": "TURBO SPARK", "tagline": "一句话", "description": "描述" },
  "person": { "name": "名字", "role": "身份", "location": "城市" },
  "siteUrl": "https://example.com"
}
```

| 字段 | 上限 |
|---|---|
| `site.title` | 60 |
| `site.tagline` | 120 |
| `site.description` | 200 |
| `person.name` | 40 |
| `person.role` | 120 |
| `person.location` | 60 |
| `siteUrl` | 200，自动去掉尾部 `/` |

成功：`200 { "ok": true, "site": {...}, "person": {...}, "siteUrl": "..." }`。

### `POST /api/admin/build`

触发一次 `node build.js`；构建中重复调用返回 409。

```json
{ "started": true, "build": { "status": "running", "startedAt": "…", "finishedAt": null, "code": null, "log": [] } }
```

### `GET /api/admin/build`

轮询构建状态与日志（最多保留 240 行）。

```json
{ "build": { "status": "done", "startedAt": "…", "finishedAt": "…", "code": 0, "log": ["…"] } }
```

---

## 状态码速查

| 码 | 场景 |
|---|---|
| 200 | 读取/更新/登录成功 |
| 201 | 注册成功、留言提交成功 |
| 202 | 构建已启动 |
| 400 | 字段缺失、格式错误 |
| 401 | 未登录或密码错误 |
| 403 | 非管理员、跨站写、注册关闭、口令错误 |
| 404 | 资源/留言不存在 |
| 405 | 方法不允许 |
| 409 | 已有构建在运行 |
| 415 | 非 JSON 写请求 |
| 429 | 触发限流 |

## 部署说明

- 静态托管（GitHub Pages）只能提供 `dist/`，本文件中的接口需在有 Node 的机器运行 `npm run api`。
- 对外部署建议前置 HTTPS 反代，并设置 `X-Forwarded-Proto: https` 以获得 Secure Cookie。
- 备份 `data/accounts.json`、`data/session.secret`、`data/inbox.jsonl`；三者均不入库。
