/* ACG 页：类型筛选 + 目录滚动高亮。仅在存在 .acg-chapter 的页面执行。 */
(function () {
  'use strict';

  var chapters = Array.prototype.slice.call(document.querySelectorAll('.acg-chapter'));
  if (!chapters.length) return;

  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-acg-filter]'));
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var filter = chip.getAttribute('data-acg-filter');
      chapters.forEach(function (chapter) {
        chapter.hidden = !(filter === '*' || chapter.getAttribute('data-medium') === filter);
      });
      chips.forEach(function (btn) {
        var active = btn === chip;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    });
  });

  var shelf = Array.prototype.slice.call(document.querySelectorAll('.acg-shelf-link'));
  if (!shelf.length || !('IntersectionObserver' in window)) return;

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var hash = '#' + entry.target.id;
      shelf.forEach(function (link) {
        link.classList.toggle('is-current', link.getAttribute('href') === hash);
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });

  chapters.forEach(function (chapter) { observer.observe(chapter); });
})();
