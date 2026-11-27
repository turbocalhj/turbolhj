/* 蓝色准星光标：四角框 + 中心点，替换原生指针。
   只做装饰，不接管任何链接或表单交互；无指针设备与 reduced-motion 下自动跳过。 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!finePointer || reduceMotion) return;
  if (document.querySelector('.ts-cursor')) return;

  var el = document.createElement('div');
  el.className = 'ts-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i></i><i></i><i></i><i></i><b></b>';
  document.body.appendChild(el);
  document.documentElement.classList.add('ts-cursor-on');

  var x = window.innerWidth / 2;
  var y = window.innerHeight / 2;
  var tx = x;
  var ty = y;
  var raf = 0;
  var seen = false;

  function frame() {
    x += (tx - x) * 0.32;
    y += (ty - y) * 0.32;
    el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
    raf = requestAnimationFrame(frame);
  }

  function wake(e) {
    tx = e.clientX;
    ty = e.clientY;
    if (!seen) {
      seen = true;
      x = tx;
      y = ty;
      el.classList.add('is-visible');
      raf = requestAnimationFrame(frame);
    }
  }

  var hotSelector = 'a, button, [role="button"], summary, label, input, textarea, select, .home-link, .home-work, .card, .panel';

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    wake(e);
    var hot = e.target && e.target.closest ? e.target.closest(hotSelector) : null;
    el.classList.toggle('is-hot', !!hot);
  }, { passive: true });

  document.addEventListener('pointerdown', function () { el.classList.add('is-down'); }, { passive: true });
  document.addEventListener('pointerup', function () { el.classList.remove('is-down'); }, { passive: true });
  document.addEventListener('mouseleave', function () { el.classList.remove('is-visible'); });
  document.addEventListener('mouseenter', function () { if (seen) el.classList.add('is-visible'); });
  window.addEventListener('blur', function () { el.classList.remove('is-visible', 'is-down'); });
})();