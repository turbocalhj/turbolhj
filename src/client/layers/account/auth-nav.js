/* 根据 /api/auth/me 切换导航里的登录/后台入口。
   静态预览（无 API）时保持默认：显示登录、隐藏后台。 */
(function () {
  'use strict';

  var loginLinks = document.querySelectorAll('[data-auth-login]');
  var adminLinks = document.querySelectorAll('[data-auth-admin]');
  if (!loginLinks.length && !adminLinks.length) return;

  function setHidden(nodes, hidden) {
    Array.prototype.forEach.call(nodes, function (el) { el.hidden = hidden; });
  }

  fetch('/api/auth/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (!data || !data.user) return;
      var isAdmin = data.user.role === 'admin';
      setHidden(loginLinks, isAdmin);
      setHidden(adminLinks, !isAdmin);
      if (!isAdmin) {
        Array.prototype.forEach.call(loginLinks, function (el) {
          el.hidden = false;
          el.setAttribute('href', '/');
          var label = el.querySelector('.nav-cn, span');
          if (label) label.textContent = '已登录';
        });
      }
    })
    .catch(function () { /* 静态服务器没有 API 时保持默认 */ });
})();