/* 文字载入动画：
   1) 进入封面与首页大标题按字符逐个浮入；
   2) 首页 hero 内所有文字字符逐个浮入（时钟等动态数字除外）；
   3) 三行简介在封面揭幕后逐字打字。
   尊重 reduced-motion；任何异常都恢复原文，避免文字丢失。 */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  function makeChar(ch, i, cls) {
    var span = document.createElement('span');
    span.className = cls;
    span.style.setProperty('--i', String(i));
    span.setAttribute('aria-hidden', 'true');
    span.textContent = ch === ' ' ? '\u00a0' : ch;
    return span;
  }

  function splitElementText(el, cls) {
    var text = el.textContent || '';
    if (!text.trim()) return;
    el.setAttribute('aria-label', text);
    el.textContent = '';
    var frag = document.createDocumentFragment();
    Array.prototype.forEach.call(Array.from(text), function (ch, i) {
      frag.appendChild(makeChar(ch, i, cls));
    });
    el.appendChild(frag);
  }

  function splitHero(root) {
    var counter = 0;
    var skip = '.home-motto, .home-clock, [data-no-reveal], script, style, svg, code, pre, input, textarea, select, [aria-hidden="true"]';
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var parent = node.parentElement;
        if (!parent || !node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (parent.closest(skip)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach(function (node) {
      var text = node.nodeValue || '';
      var frag = document.createDocumentFragment();
      var i = 0;
      while (i < text.length) {
        var rest = text.slice(i);
        var space = rest.match(/^\s+/);
        if (space) {
          for (var s = 0; s < space[0].length; s += 1) frag.appendChild(makeChar(' ', counter++, 'hero-ch'));
          i += space[0].length;
          continue;
        }
        var word = rest.match(/^[A-Za-z0-9_@#./%+\-]+/);
        if (word) {
          var wrap = document.createElement('span');
          wrap.className = 'hero-word';
          Array.prototype.forEach.call(Array.from(word[0]), function (ch) {
            wrap.appendChild(makeChar(ch, counter++, 'hero-ch'));
          });
          frag.appendChild(wrap);
          i += word[0].length;
        } else {
          frag.appendChild(makeChar(text[i], counter++, 'hero-ch'));
          i += 1;
        }
      }
      node.parentNode.replaceChild(frag, node);
    });
  }

  try {
    Array.prototype.forEach.call(document.querySelectorAll('.entry-wordmark .entry-line'), function (el) {
      el.classList.add('is-split');
      splitElementText(el, 'entry-ch');
    });
    var hero = document.querySelector('.home-hero');
    if (hero) splitHero(hero);
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