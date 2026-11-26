(function () {
  'use strict';
  const form = document.getElementById('auth-form');
  if (!form) return;
  const mode = form.dataset.mode === 'register' ? 'register' : 'login';
  const error = document.getElementById('auth-error');
  const submit = form.querySelector('button[type="submit"]');

  const show = (msg) => {
    if (!error) return;
    error.textContent = msg || '';
    error.hidden = !msg;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    show('');
    const data = Object.fromEntries(new FormData(form).entries());
    if (submit) { submit.disabled = true; submit.textContent = '处理中…'; }
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(data),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || '请求失败');
      const next = new URLSearchParams(location.search).get('next');
      const target = next && next.startsWith('/') ? next : (payload.user && payload.user.role === 'admin' ? '/admin.html' : '/');
      location.href = target;
    } catch (err) {
      show(err.message);
      if (submit) { submit.disabled = false; submit.textContent = mode === 'register' ? '注册' : '登录'; }
    }
  });
})();
