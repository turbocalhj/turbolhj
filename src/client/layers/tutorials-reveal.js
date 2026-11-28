/* 学习教程卡片滚动渐入，参照 blog.ayeez.cn 的 row-reveal。 */
(function () {
  'use strict';

  var cards = Array.prototype.slice.call(document.querySelectorAll('.tutorial-card'));
  if (!cards.length) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;

  cards.forEach(function (card) { card.classList.add('is-reveal'); });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

  cards.forEach(function (card) { observer.observe(card); });
})();