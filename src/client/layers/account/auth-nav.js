/* 账号导航：登录后显示头像菜单（个人中心 / 后台 / 退出登录）。 */
(function () {
  'use strict';

  var loginLinks = document.querySelectorAll('[data-auth-login]');
  var accounts = document.querySelectorAll('[data-auth-account]');
  if (!loginLinks.length && !accounts.length) return;

  function setHidden(nodes, hidden) {
    Array.prototype.forEach.call(nodes, function (el) { el.hidden = hidden; });
  }

  function bindMenu(account) {
    var trigger = account.querySelector('.nav-account-trigger');
    if (!trigger) return;
    trigger.addEventListener('click', function (event) {
      event.stopPropagation();
      var open = account.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  function bindLogout() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-auth-logout]'), function (btn) {
      btn.addEventListener('click', function () {
        fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' })
          .catch(function () {})
          .finally(function () { location.href = '/'; });
      });
    });
  }

  function applyUser(user) {
    setHidden(loginLinks, true);
    setHidden(accounts, false);
    Array.prototype.forEach.call(accounts, function (account) {
      var avatar = account.querySelector('[data-auth-avatar]');
      var name = account.querySelector('[data-auth-name]');
      var adminLink = account.querySelector('[data-auth-admin-link]');
      if (avatar) {
        avatar.src = user.avatar || '/assets/avatar/default.svg';
        avatar.alt = (user.name || '账号') + ' 的头像';
      }
      if (name) name.textContent = user.name || '账号';
      if (adminLink) adminLink.hidden = user.role !== 'admin';
      bindMenu(account);
    });
    bindLogout();
  }

  fetch('/api/auth/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (data && data.user) applyUser(data.user);
    })
    .catch(function () { /* 静态服务器无 API 时保持默认 */ });

  document.addEventListener('click', function (event) {
    Array.prototype.forEach.call(document.querySelectorAll('.nav-account.is-open'), function (account) {
      if (!account.contains(event.target)) {
        account.classList.remove('is-open');
        var trigger = account.querySelector('.nav-account-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  });
})();