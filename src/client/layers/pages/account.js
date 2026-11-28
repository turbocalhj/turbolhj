/* 账号中心：读取资料、保存昵称/简介、修改密码、退出登录。 */
(function () {
  'use strict';

  var profileForm = document.getElementById('profile-form');
  if (!profileForm) return;

  var avatar = document.getElementById('account-avatar');
  var nameEl = document.getElementById('account-name');
  var emailEl = document.getElementById('account-email');
  var joinedEl = document.getElementById('account-joined');
  var roleEl = document.getElementById('account-role');
  var nameInput = document.getElementById('account-name-input');
  var bioInput = document.getElementById('account-bio');
  var profileMsg = document.getElementById('profile-msg');
  var passwordForm = document.getElementById('password-form');
  var passwordMsg = document.getElementById('password-msg');

  function api(path, options) {
    return fetch(path, Object.assign({ credentials: 'same-origin' }, options, {
      headers: Object.assign({ Accept: 'application/json' }, options && options.body ? { 'Content-Type': 'application/json' } : {}),
    })).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) {
          location.href = '/login.html?next=/account.html';
          throw new Error('未登录');
        }
        if (!res.ok) throw new Error(data.error || '请求失败');
        return data;
      });
    });
  }

  function message(el, text, ok) {
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
    el.classList.toggle('is-ok', !!ok);
    el.classList.toggle('is-error', !!text && !ok);
  }

  function fill(user) {
    if (avatar) avatar.src = user.avatar || '/assets/avatar/default.svg';
    if (nameEl) nameEl.textContent = user.name || '账号';
    if (emailEl) emailEl.textContent = user.email || '';
    if (joinedEl) joinedEl.textContent = user.createdAt ? '加入于 ' + new Date(user.createdAt).toLocaleDateString('zh-CN') : '';
    if (roleEl) roleEl.textContent = user.role === 'admin' ? 'ADMIN / 管理员' : 'USER / 普通用户';
    if (nameInput) nameInput.value = user.name || '';
    if (bioInput) bioInput.value = user.bio || '';
    document.title = (user.name || '账号') + ' · 个人中心';
  }

  api('/api/account/profile')
    .then(function (data) { fill(data.user); })
    .catch(function (err) { message(profileMsg, err.message, false); });

  profileForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new FormData(profileForm);
    message(profileMsg, '保存中…');
    api('/api/account/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: String(data.get('name') || ''), bio: String(data.get('bio') || '') }),
    })
      .then(function (res) { fill(res.user); message(profileMsg, '资料已保存。', true); })
      .catch(function (err) { message(profileMsg, err.message, false); });
  });

  if (passwordForm) {
    passwordForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(passwordForm);
      message(passwordMsg, '修改中…');
      api('/api/account/password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: String(data.get('currentPassword') || ''),
          newPassword: String(data.get('newPassword') || ''),
        }),
      })
        .then(function () {
          passwordForm.reset();
          message(passwordMsg, '密码已修改。', true);
        })
        .catch(function (err) { message(passwordMsg, err.message, false); });
    });
  }

  var logout = document.getElementById('account-logout');
  if (logout) {
    logout.addEventListener('click', function () {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .catch(function () {})
        .finally(function () { location.href = '/'; });
    });
  }
})();