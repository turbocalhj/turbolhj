---
name: turbospark-auth-admin
description: 扩展或维护 TURBO SPARK 的零依赖账号/会话/后台 API（server/lib/auth.js、server/index.js）。当需要注册登录、管理员、限流、会话 Cookie、留言后台、配置/重建接口，或排查 401/403/跨站写入时使用。
---

# TURBO SPARK 账号与后台 API

## 结构

- `server/index.js`：静态托管 + `/api/*`；`handleAccountApi` 处理 `/api/auth/*` 与 `/api/admin/*`。
- `server/lib/auth.js`：用户存储、scrypt 密码、HMAC 会话、角色校验、限流、管理员播种。
- 前端：`src/client/auth.js`（登录/注册）、`src/client/admin.js`（后台标签页），页面由 `authPage/adminPage` 生成。
- 数据：`data/accounts.json`、`data/session.secret`、`data/inbox.jsonl`，均已 gitignore。

## 启动

```powershell
npm run build
npm run api          # http://127.0.0.1:8787
```

可选环境变量：

| 变量 | 作用 |
|---|---|
| `PORT` / `HOST` | 默认 8787 / 127.0.0.1 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | 启动时播种/更新管理员 |
| `ALLOW_REGISTER=0` | 关闭访客注册 |
| `ADMIN_SETUP_TOKEN` | 首个管理员注册时必须携带的口令 |

第一个注册用户自动成为 `admin`，之后为 `user`。`npm run dev` 的 5173 没有 API，账号相关必须用 8787。

## 路由

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/auth/me` | 当前用户 |
| POST | `/api/auth/register` | 昵称/邮箱/密码；限流 5 次/分/IP |
| POST | `/api/auth/login` | 邮箱+密码；限流 8 次/分/IP |
| POST | `/api/auth/logout` | 清 Cookie、`sessionVersion++` |
| GET | `/api/admin/inbox` | 留言列表（倒序） |
| POST | `/api/admin/inbox/delete` | 删除留言 |
| GET | `/api/admin/stats` | dist 文件/体积/索引/留言/用户/构建状态 |
| GET/PUT | `/api/admin/config` | 读取/合并允许的站点字段 |
| POST/GET | `/api/admin/build` | 触发 `node build.js` / 轮询日志（保留 240 行） |

## 安全不变量（改接口时必须保持）

- 密码 `crypto.scryptSync` 64 字节 + 每用户随机盐；比较用 `timingSafeEqual`。
- 会话载荷 `{uid, role, v, exp}`，HMAC-SHA256 签名；Cookie `ts_session`：HttpOnly、SameSite=Lax、7 天、https 时 Secure。
- `sessionVersion` 递增即可让旧会话全部失效（改密/登出）。
- 所有写操作要求 `Content-Type: application/json` 且同源 `Origin` 校验；跨站 POST 必须 403。
- 登录/注册/联系表单按 IP 限流；留言表单 5 次/分。
- 管理员接口统一 `requireAdmin`；普通用户 403。
- 配置写入用 `.tmp` + rename 原子替换，只接受白名单字段。
- 触发构建用 `spawn`，保留有限日志；不要拼接 shell 字符串。

## 扩展一个 API 的步骤

1. 在 `handleAccountApi` 加路由分支，先做方法/权限/同源校验。
2. 输入逐字段校验（类型、长度、格式），错误返回 4xx + JSON `{error}`。
3. 需要落盘时用追加 JSONL（留言）或原子写（配置）；不要整文件重排。
4. 前端在 `src/client/admin.js` 统一 `api()`，401 跳登录，403 提示权限。
5. 测试：注册 → `/api/auth/me` → 管理员接口 → 跨站 POST 403 → 普通用户 403。
6. 清理测试账号/会话/临时 JSON，避免首个真实用户错失管理员。

PowerShell 测试用临时文件传 JSON，避免内联转义挂起：

```powershell
'{"email":"a@b.com","password":"12345678"}' | Set-Content -Encoding utf8 body.json
curl.exe -i -c cookies.txt -H "Content-Type: application/json" --data-binary "@body.json" http://127.0.0.1:8787/api/auth/register
```

## 部署

- GitHub Pages 只能托管 `dist/` 静态文件，账号/后台必须在有 Node 的机器跑 `npm run api`。
- 对外部署时前置 HTTPS 反代（Caddy/Nginx），并备份 `data/` 三个文件；不要提交它们。
- 修改会话密钥会让所有用户重新登录，属预期行为。
