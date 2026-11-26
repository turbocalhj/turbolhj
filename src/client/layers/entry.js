/* 进入封面：首页首次进入时叠加满屏封面，点击 / 滚动 / 回车 / Esc 揭幕。
   会话内只出现一次；尊重 prefers-reduced-motion；与 boot 动画、主题、视图过渡共存。 */
(function () {
  'use strict';

  var KEY = 'ts-entry-cover';
  var html = document.documentElement;
  var body = document.body;

  // 仅首页生效（其余页面直接退出）
  if (!body || !body.classList.contains('home')) return;

  var cover = document.getElementById('entry-cover');
  if (!cover) return;

  // 无动画偏好：完全不显示
  var reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  if (reduceQuery && reduceQuery.matches) {
    removeCover();
    return;
  }

  // 同一会话只出现一次
  try {
    if (sessionStorage.getItem(KEY)) {
      removeCover();
      return;
    }
  } catch (e) { /* 隐私模式等场景下无法读写，按首次进入处理 */ }

  var enterBtn = cover.querySelector('.entry-enter');
  var opened = false;
  var closing = false;
  var savedScroll = 0;
  var savedOverflow = '';
  var timer = 0;

  function removeCover() {
    if (cover.parentNode) cover.parentNode.removeChild(cover);
  }

  function markSeen() {
    try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) { /* 忽略存储失败 */ }
  }

  function lockScroll() {
    savedScroll = window.pageYOffset || window.scrollY || 0;
    savedOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    html.classList.add('entry-open');
  }

  function unlockScroll() {
    html.classList.remove('entry-open');
    body.style.overflow = savedOverflow;
    cover.hidden = true;
    if (savedScroll) window.scrollTo(0, savedScroll);
  }

  function focusEnter() {
    if (!enterBtn) return;
    try { enterBtn.focus({ preventScroll: true }); } catch (e) { enterBtn.focus(); }
  }

  function show() {
    if (opened || closing) return;
    opened = true;
    markSeen();
    lockScroll();
    cover.hidden = false;
    // 两帧后再加类，确保 display 变化已生效，过渡才会播放
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (closing) return;
        cover.classList.add('is-in');
      });
    });
    focusEnter();
    bind();
  }

  function focusables() {
    return Array.prototype.slice.call(cover.querySelectorAll('a[href], button:not([disabled])'));
  }

  function onKey(e) {
    if (closing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
    } else if (e.key === 'Enter') {
      // 焦点在更新公告链接上时，把回车交还给浏览器执行跳转
      if (document.activeElement && document.activeElement.tagName === 'A') return;
      e.preventDefault();
      dismiss();
    } else if (e.key === 'Tab') {
      // 焦点在封面内的链接与按钮之间循环，避免外泄到被遮挡的页面
      var list = focusables();
      if (!list.length) return;
      var idx = list.indexOf(document.activeElement);
      e.preventDefault();
      var next = e.shiftKey
        ? (idx <= 0 ? list.length - 1 : idx - 1)
        : (idx === -1 || idx === list.length - 1 ? 0 : idx + 1);
      list[next].focus();
    }
  }

  function onWheel(e) {
    if (e.cancelable) e.preventDefault();
    dismiss();
  }

  function onTouchMove(e) {
    if (e.cancelable) e.preventDefault();
    dismiss();
  }

  function onClick() {
    dismiss();
  }

  function bind() {
    document.addEventListener('keydown', onKey, true);
    cover.addEventListener('wheel', onWheel, { passive: false });
    cover.addEventListener('touchmove', onTouchMove, { passive: false });
    cover.addEventListener('click', onClick);
  }

  function unbind() {
    document.removeEventListener('keydown', onKey, true);
    cover.removeEventListener('wheel', onWheel);
    cover.removeEventListener('touchmove', onTouchMove);
    cover.removeEventListener('click', onClick);
  }

  function dismiss() {
    if (!opened || closing) return;
    closing = true;
    unbind();
    cover.classList.remove('is-in');
    cover.classList.add('is-out');
    if (enterBtn && document.activeElement === enterBtn) enterBtn.blur();
    timer = window.setTimeout(finish, 720);
  }

  function finish() {
    window.clearTimeout(timer);
    unlockScroll();
    removeCover();
    var active = document.activeElement;
    if (active && active !== body) {
      try { active.blur(); } catch (e) { /* 忽略 */ }
    }
    // 揭幕后把焦点交还页面主区域，键盘用户可继续 Tab
    var main = document.getElementById('main');
    if (main && main.focus) {
      try { main.setAttribute('tabindex', '-1'); main.focus({ preventScroll: true }); } catch (e) { /* 忽略 */ }
      window.setTimeout(function () { main.removeAttribute('tabindex'); }, 0);
    }
  }

  /** 若正处在 boot 载入动画中，等 html 去掉 is-booting 再显示。 */
  function afterBoot(fn) {
    if (!html.classList.contains('is-booting')) {
      window.setTimeout(fn, 380);
      return;
    }
    var done = false;
    var observer = new MutationObserver(function () {
      if (!html.classList.contains('is-booting')) settle();
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    var poll = window.setInterval(function () {
      if (!html.classList.contains('is-booting')) settle();
    }, 200);
    var guard = window.setTimeout(settle, 6000);

    function settle() {
      if (done) return;
      done = true;
      observer.disconnect();
      window.clearInterval(poll);
      window.clearTimeout(guard);
      window.setTimeout(fn, 260);
    }
  }

  // 会话中途切换到 reduced-motion 时立即收场，避免层被 CSS 隐藏后仍锁定滚动
  if (reduceQuery && reduceQuery.addEventListener) {
    reduceQuery.addEventListener('change', function (e) {
      if (e.matches) dismiss();
    });
  }

  afterBoot(show);
})();
