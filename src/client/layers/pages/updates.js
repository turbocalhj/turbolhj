/* 更新公告页：按标签筛选条目。仅在存在 .log-page 的页面执行。 */
(function () {
  'use strict';

  var page = document.querySelector('.log-page');
  if (!page) return;

  var tabs = Array.prototype.slice.call(page.querySelectorAll('[data-upd-filter]'));
  var items = Array.prototype.slice.call(page.querySelectorAll('.log-item'));
  var empty = page.querySelector('.log-noresult');
  if (!tabs.length || !items.length) return;

  function apply(filter) {
    var shown = 0;
    items.forEach(function (item) {
      var hit = filter === '*' || item.getAttribute('data-tag') === filter;
      item.hidden = !hit;
      if (hit) shown += 1;
    });

    tabs.forEach(function (tab) {
      var active = tab.getAttribute('data-upd-filter') === filter;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (empty) empty.hidden = shown > 0;
  }

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      apply(tab.getAttribute('data-upd-filter'));
    });
  });
})();
