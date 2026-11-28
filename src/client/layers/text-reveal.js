/* 文字载入动画：
   1) 进入封面与首页大标题按字符逐个浮入；
   2) 首页三行简介在封面揭幕后逐字打字。
   尊重 reduced-motion；任何异常都恢复原文，避免文字丢失。 */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  function splitChars(el, cls) {
    var text = el.textContent || '';
    if (!text.trim()) return;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(Array.from(text), function (ch, i) {
      var span = document.createElement('span');
      span.className = cls;
      span.style.setProperty('--i', String(i));
      span.setAttribute('aria-hidden', 'true');
      span.textContent = ch === ' ' ? '\u00a0' : ch;
      frag.appendChild(span);
    });
    el.appendChild(frag);
  }

  try {
    Array.prototype.forEach.call(document.querySelectorAll('.entry-wordmark .entry-line'), function (el) {
      el.classList.add('is-split');
      splitChars(el, 'entry-ch');
    });
    var name = document.querySelector('.home-name');
    if (name) splitChars(name, 'hero-ch');
  } catch (e) { /* 字符拆分失败时保留原文 */ }

  var lines = Array.prototype.map.call(document.querySelectorAll('.home-motto p'), function (p) {
    return { el: p, text: p.textContent || '' };
  }).filter(function (l) { return l.text; });

  if (lines.length) {
    lines.forEach(function (l) { l.el.textContent = ''; });

    var started = false;
    function startTyping() {
      if (started) return;
      started = true;
      var li = 0;
      var ci = 0;

      function step() {
        if (li >= lines.length) return;
        var line = lines[li];
        if (ci === 0) line.el.classList.add('is-typing');
        ci += 1;
        line.el.textContent = line.text.slice(0, ci);
        if (ci >= line.text.length) {
          line.el.classList.remove('is-typing');
          li += 1;
          ci = 0;
          window.setTimeout(step, 200);
        } else {
          window.setTimeout(step, 38);
        }
      }
      window.setTimeout(step, 220);
    }

    if (document.body.classList.contains('is-hero-in')) {
      startTyping();
    } else {
      var observer = new MutationObserver(function () {
        if (document.body.classList.contains('is-hero-in')) {
          observer.disconnect();
          startTyping();
        }
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }
  }
})();