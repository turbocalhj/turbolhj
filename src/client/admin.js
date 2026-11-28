(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const api = async (path, options = {}) => {
    const res = await fetch(path, {
      credentials: 'same-origin',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { location.href = '/login.html?next=/admin.html'; throw new Error('未登录'); }
    if (!res.ok) throw new Error(data.error || '请求失败');
    return data;
  };

  const fmtBytes = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB');
  const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('zh-CN') : '—');

  /* 登录态 */
  api('/api/auth/me').then(({ user }) => {
    if (!user || user.role !== 'admin') { location.href = '/login.html?next=/admin.html'; return; }
    const box = $('#admin-user');
    if (box) box.textContent = user.name || user.email;
    boot();
  }).catch(() => {});

  const logout = $('#admin-logout');
  if (logout) {
    logout.addEventListener('click', async () => {
      await api('/api/auth/logout', { method: 'POST', body: '{}' }).catch(() => {});
      location.href = '/';
    });
  }

  /* 标签切换 */
  const tabs = $$('.admin-tab');
  const panels = $$('.admin-panel');
  const activate = (name) => {
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
    panels.forEach((p) => { p.hidden = p.dataset.panel !== name; });
  };
  tabs.forEach((t) => t.addEventListener('click', () => activate(t.dataset.tab)));

  function boot() {
    activate('overview');
    loadStats();
    loadInbox();
    loadConfig();
  }

  /* 概览 */
  async function loadStats() {
    try {
      const s = await api('/api/admin/stats');
      $('#stat-files').textContent = s.distFiles.toLocaleString();
      $('#stat-size').textContent = fmtBytes(s.distBytes);
      $('#stat-index').textContent = fmtBytes(s.indexBytes);
      $('#stat-inbox').textContent = String(s.inbox);
      $('#stat-users').textContent = String(s.users);
      $('#stat-built').textContent = fmtTime(s.builtAt);
      $('#stat-uptime').textContent = Math.floor(s.uptime / 60) + ' 分钟';
      const status = { idle: '待命', running: '构建中', done: '成功', error: '失败' }[s.build.status] || s.build.status;
      $('#build-status').textContent = status;
      $('#stat-build').textContent = s.build.finishedAt ? fmtTime(s.build.finishedAt) : status;
    } catch (err) {
      $('#stat-files').textContent = err.message;
    }
  }

  /* 留言 */
  async function loadInbox() {
    const list = $('#inbox-list');
    if (!list) return;
    const { items } = await api('/api/admin/inbox');
    if (!items.length) {
      list.innerHTML = '<p class="admin-empty">暂无留言。</p>';
      return;
    }
    list.innerHTML = items.map((m) => `<article class="admin-msg">
      <header><b>${escapeHtml(m.name || '匿名')}</b><span>${escapeHtml(m.email || '')}</span><time>${fmtTime(m.at)}</time></header>
      <p>${escapeHtml(m.message || '')}</p>
      <button type="button" class="btn btn-ghost admin-del" data-id="${m.id}">删除</button>
    </article>`).join('');
  }

  const inbox = $('#inbox-list');
  if (inbox) {
    inbox.addEventListener('click', async (e) => {
      const btn = e.target.closest('.admin-del');
      if (!btn) return;
      btn.disabled = true;
      try {
        await api('/api/admin/inbox/delete', { method: 'POST', body: JSON.stringify({ id: Number(btn.dataset.id) }) });
        btn.closest('.admin-msg').remove();
        loadStats();
      } catch (err) { btn.disabled = false; alert(err.message); }
    });
  }

  /* 配置 */
  async function loadConfig() {
    const data = await api('/api/admin/config');
    const fill = (name, value) => { const el = document.querySelector(`[name="${name}"]`); if (el) el.value = value || ''; };
    fill('site.title', data.site.title);
    fill('site.tagline', data.site.tagline);
    fill('site.description', data.site.description);
    fill('person.name', data.person.name);
    fill('person.role', data.person.role);
    fill('person.location', data.person.location);
    fill('siteUrl', data.siteUrl);
  }

  const configForm = $('#config-form');
  if (configForm) {
    configForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = $('#config-msg');
      const body = {
        site: {
          title: configForm['site.title'].value,
          tagline: configForm['site.tagline'].value,
          description: configForm['site.description'].value,
        },
        person: {
          name: configForm['person.name'].value,
          role: configForm['person.role'].value,
          location: configForm['person.location'].value,
        },
        siteUrl: configForm.siteUrl.value,
      };
      try {
        await api('/api/admin/config', { method: 'PUT', body: JSON.stringify(body) });
        if (msg) { msg.textContent = '已保存，重新构建后生效。'; msg.hidden = false; }
      } catch (err) {
        if (msg) { msg.textContent = err.message; msg.hidden = false; }
      }
    });
  }

  /* 构建 */
  const runBtn = $('#build-run');
  const logBox = $('#build-log');
  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true;
      try {
        await api('/api/admin/build', { method: 'POST', body: '{}' });
        pollBuild();
      } catch (err) {
        runBtn.disabled = false;
        if (logBox) logBox.textContent = err.message;
      }
    });
    pollBuild();
  }

  let polling = false;
  async function pollBuild() {
    if (polling) return;
    polling = true;
    try {
      const { build } = await api('/api/admin/build');
      if (logBox) logBox.textContent = build.log.join('\n');
      const status = $('#build-status');
      if (status) status.textContent = { idle: '待命', running: '构建中', done: '成功', error: '失败' }[build.status] || build.status;
      if (runBtn) runBtn.disabled = build.status === 'running';
      if (build.status === 'running') setTimeout(pollBuild, 1000);
      else { if (logBox) logBox.scrollTop = logBox.scrollHeight; loadStats(); }
    } catch { /* 忽略轮询错误 */ }
    polling = false;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
})();
