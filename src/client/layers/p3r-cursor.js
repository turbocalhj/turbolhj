/* 蓝色准星光标：外层只做定点，内层准星以中心对齐鼠标。
   即时跟随（无 lerp / 无延迟），缩放不改变中心；无指针设备与 reduced-motion 下自动跳过。 */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!finePointer || reduceMotion) return;
  if (document.querySelector('.ts-cursor')) return;

  var el = document.createElement('div');
  el.className = 'ts-cursor';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span class="ts-cursor-box"><i></i><i></i><i></i><i></i><b></b></span>';
  document.body.appendChild(el);
  document.documentElement.classList.add('ts-cursor-on');

  var seen = false;
  var hotSelector = 'a, button, [role="button"], summary, label, input, textarea, select';

  function place(e) {
    el.style.transform = 'translate3d(' + e.clientX + 'px,' + e.clientY + 'px,0)';
    if (!seen) {
      seen = true;
      el.classList.add('is-visible');
    }
    var hot = e.target && e.target.closest ? e.target.closest(hotSelector) : null;
    el.classList.toggle('is-hot', !!hot);
  }

  document.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    place(e);
  }, { passive: true });

  document.addEventListener('pointerdown', function () { el.classList.add('is-down'); }, { passive: true });
  document.addEventListener('pointerup', function () { el.classList.remove('is-down'); }, { passive: true });

  window.addEventListener('mouseout', function (e) {
    if (!e.relatedTarget) el.classList.remove('is-visible');
  });
  window.addEventListener('mouseover', function () {
    if (seen) el.classList.add('is-visible');
  });
  window.addEventListener('blur', function () { el.classList.remove('is-visible', 'is-down'); });
})();