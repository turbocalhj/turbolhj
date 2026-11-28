/* 游戏成就按游戏筛选：纯前端切换 hidden，不请求接口。 */
(function () {
  'use strict';

  var tabs = document.querySelectorAll('[data-ach-tab]');
  var cards = document.querySelectorAll('.ach-card');
  if (!tabs.length || !cards.length) return;

  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener('click', function () {
      var key = tab.getAttribute('data-ach-tab');
      Array.prototype.forEach.call(tabs, function (t) {
        t.classList.toggle('is-active', t === tab);
        t.setAttribute('aria-pressed', t === tab ? 'true' : 'false');
      });
      Array.prototype.forEach.call(cards, function (card) {
        card.hidden = key !== 'all' && card.getAttribute('data-game') !== key;
      });
    });
  });
})();