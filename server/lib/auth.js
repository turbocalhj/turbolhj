import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 账号与会话：零依赖。
 * - 密码用 scrypt + 随机盐哈希
 * - 会话用 HMAC-SHA256 签名 Cookie，不落库；改密码/登出通过 sessionVersion 失效
 * - 账号数据写入 data/accounts.json（已 gitignore）
 */
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = path.join(ROOT, 'data');
const ACCOUNTS = path.join(DATA, 'accounts.json');
const SECRET_FILE = path.join(DATA, 'session.secret');
const COOKIE = 'ts_session';
const MAX_AGE = 60 * 60 * 24 * 7;

const SECRET = (() => {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  try { return fs.readFileSync(SECRET_FILE, 'utf8').trim(); } catch { /* 首次运行生成 */ }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
})();

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(ACCOUNTS, 'utf8'));
    return Array.isArray(data.users) ? data : { users: [] };
  } catch {
    return { users: [] };
  }
}

const db = load();

function save() {
  fs.mkdirSync(DATA, { recursive: true });
  const tmp = `${ACCOUNTS}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, ACCOUNTS);
}

/** 异步 scrypt：登录/注册不再阻塞事件循环。 */
function hash(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, key) => (err ? reject(err) : resolve(key.toString('hex'))));
  });
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar || '/assets/avatar/default.svg',
    bio: user.bio || '',
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function findUser(email) {
  return db.users.find((u) => u.email === String(email).toLowerCase());
}

export function countUsers() {
  return db.users.length;
}

export async function createUser({ email, password, name, role = 'user', avatar = '/assets/avatar/default.svg', bio = '' }) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) throw new Error('邮箱格式不正确');
  if (String(password || '').length < 8) throw new Error('密码至少 8 位');
  if (findUser(normalized)) throw new Error('该邮箱已注册');
  const salt = crypto.randomBytes(16).toString('hex');
  const user = {
    id: crypto.randomUUID(),
    email: normalized,
    name: String(name || '').trim().slice(0, 40) || normalized.split('@')[0],
    avatar,
    bio: String(bio || '').trim().slice(0, 160),
    role,
    salt,
    hash: await hash(password, salt),
    createdAt: new Date().toISOString(),
    sessionVersion: 1,
  };
  db.users.push(user);
  save();
  return publicUser(user);
}

export async function verifyPassword(email, password) {
  const user = findUser(email);
  if (!user) return null;
  const attempt = Buffer.from(await hash(String(password || ''), user.salt), 'hex');
  const expected = Buffer.from(user.hash, 'hex');
  if (attempt.length !== expected.length) return null;
  return crypto.timingSafeEqual(attempt, expected) ? publicUser(user) : null;
}

export async function setPassword(userId, password) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('用户不存在');
  if (String(password || '').length < 8) throw new Error('密码至少 8 位');
  user.salt = crypto.randomBytes(16).toString('hex');
  user.hash = await hash(password, user.salt);
  user.sessionVersion += 1;
  save();
}

export async function updateProfile(userId, { name, bio }) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('用户不存在');
  if (name !== undefined) {
    const next = String(name || '').trim().slice(0, 32);
    if (next) user.name = next;
  }
  if (bio !== undefined) user.bio = String(bio || '').trim().slice(0, 160);
  save();
  return publicUser(user);
}

export async function changePassword(userId, currentPassword, nextPassword) {
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('用户不存在');
  const attempt = Buffer.from(await hash(String(currentPassword || ''), user.salt), 'hex');
  const expected = Buffer.from(user.hash, 'hex');
  if (attempt.length !== expected.length || !crypto.timingSafeEqual(attempt, expected)) {
    throw new Error('当前密码不正确');
  }
  if (String(nextPassword || '').length < 8) throw new Error('新密码至少 8 位');
  user.salt = crypto.randomBytes(16).toString('hex');
  user.hash = await hash(nextPassword, user.salt);
  user.sessionVersion += 1;
  save();
  return publicUser(user);
}

export async function ensureAdminByEnv() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return null;
  if (findUser(email)) return null;
  const user = await createUser({
    email,
    password,
    name: process.env.ADMIN_NAME || '无根生',
    avatar: '/assets/avatar/wugensheng.jpg',
    role: 'admin',
  });
  console.log(`[auth] 已根据环境变量创建管理员：${user.email}`);
  return user;
}

/* ---------- 会话 ---------- */
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function unsign(token) {
  if (!token || !token.includes('.')) return null;
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (mac.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const at = part.indexOf('=');
    if (at < 0) continue;
    out[part.slice(0, at).trim()] = decodeURIComponent(part.slice(at + 1).trim());
  }
  return out;
}

export function issueSession(res, user, secure) {
  const record = db.users.find((u) => u.id === user.id);
  const token = sign({ uid: user.id, role: user.role, v: record ? record.sessionVersion : 1, exp: Date.now() + MAX_AGE * 1000 });
  const attrs = [`${COOKIE}=${token}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${MAX_AGE}`];
  if (secure) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export function currentUser(req) {
  const payload = unsign(parseCookies(req)[COOKIE]);
  if (!payload) return null;
  const user = db.users.find((u) => u.id === payload.uid);
  if (!user || user.sessionVersion !== payload.v) return null;
  return publicUser(user);
}

export function requireUser(req) {
  const user = currentUser(req);
  if (!user) { const err = new Error('未登录'); err.status = 401; throw err; }
  return user;
}

export function requireAdmin(req) {
  const user = requireUser(req);
  if (user.role !== 'admin') { const err = new Error('需要管理员权限'); err.status = 403; throw err; }
  return user;
}

/* ---------- 登录/注册限流 ---------- */
const buckets = new Map();

export function rateLimit(key, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const list = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (list.length >= limit) { buckets.set(key, list); return false; }
  list.push(now);
  buckets.set(key, list);
  return true;
}
