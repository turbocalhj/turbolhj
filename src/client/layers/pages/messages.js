/* 留言板：加载 /api/messages，提交到 /api/messages，纯 DOM 渲染避免 XSS。 */
(function () {
  'use strict';

  var listEl = document.getElementById('msg-list');
  if (!listEl) return;

  var form = document.getElementById('message-form');
  var countEl = document.getElementById('msg-chars');
  var counterEl = document.getElementById('msg-count');
  var statusEl = document.getElementById('msg-status');
  var previewBtn = document.getElementById('msg-preview');
  var previewBox = document.getElementById('msg-preview-box');
  var sendBtn = document.getElementById('msg-send');
  var sortMode = 'new';
  var messages = [];

  function formatTime(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || '';
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function avatarColor(name) {
    var hue = 0;
    for (var i = 0; i < name.length; i += 1) hue = (hue * 31 + name.charCodeAt(i)) % 360;
    return 'linear-gradient(135deg, hsl(' + hue + ' 62% 40%), hsl(' + ((hue + 38) % 360) + ' 68% 28%))';
  }

  function setStatus(text, kind) {
    statusEl.textContent = text || '';
    statusEl.classList.toggle('is-error', kind === 'error');
    statusEl.classList.toggle('is-ok', kind === 'ok');
  }

  function buildItem(item) {
    var article = document.createElement('article');
    article.className = 'msg-item';
    var name = (item.name || '匿名').slice(0, 32);
    var avatar = document.createElement('span');
    avatar.className = 'msg-avatar';
    avatar.textContent = Array.from(name)[0] || '?';
    avatar.style.background = avatarColor(name);

    var body = document.createElement('div');
    body.className = 'msg-body';
    var meta = document.createElement('div');
    meta.className = 'msg-meta';
    var nameEl = document.createElement('b');
    nameEl.textContent = name;
    var timeEl = document.createElement('time');
    timeEl.textContent = formatTime(item.at);
    meta.appendChild(nameEl);
    meta.appendChild(timeEl);
    if (item.website) {
      var site = document.createElement('a');
      site.className = 'msg-site';
      site.href = item.website;
      site.target = '_blank';
      site.rel = 'noopener noreferrer';
      site.textContent = '网站 ↗';
      meta.appendChild(site);
    }
    var text = document.createElement('p');
    text.className = 'msg-text';
    text.textContent = item.message || '';
    body.appendChild(meta);
    body.appendChild(text);
    article.appendChild(avatar);
    article.appendChild(body);
    return article;
  }

  function render() {
    var sorted = messages.slice().sort(function (a, b) {
      return new Date(a.at || 0) - new Date(b.at || 0);
    });
    if (sortMode === 'new') sorted.reverse();
    listEl.textContent = '';
    if (!sorted.length) {
      var empty = document.createElement('p');
      empty.className = 'msg-empty';
      empty.textContent = '还没有留言，来坐第一排。';
      listEl.appendChild(empty);
    } else {
      sorted.forEach(function (item) { listEl.appendChild(buildItem(item)); });
    }
    counterEl.textContent = messages.length + ' 条留言';
  }

  function load() {
    fetch('/api/messages?limit=100', { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        messages = Array.isArray(data.messages) ? data.messages : [];
        render();
      })
      .catch(function () {
        listEl.textContent = '';
        var empty = document.createElement('p');
        empty.className = 'msg-empty';
        empty.textContent = '留言服务暂不可用，请用 npm run dev 启动带 API 的服务。';
        listEl.appendChild(empty);
        counterEl.textContent = '连接失败';
      });
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-msg-sort]'), function (btn) {
    btn.addEventListener('click', function () {
      sortMode = btn.getAttribute('data-msg-sort') || 'new';
      Array.prototype.forEach.call(document.querySelectorAll('[data-msg-sort]'), function (other) {
        other.classList.toggle('is-active', other === btn);
        other.setAttribute('aria-pressed', other === btn ? 'true' : 'false');
      });
      render();
    });
  });

  var textarea = form ? form.querySelector('textarea[name="message"]') : null;
  if (textarea && countEl) {
    textarea.addEventListener('input', function () {
      countEl.textContent = textarea.value.length + ' / 500';
    });
  }

  if (previewBtn && previewBox && textarea) {
    previewBtn.addEventListener('click', function () {
      var text = textarea.value.trim();
      if (!text) {
        setStatus('先写点什么再预览吧。', 'error');
        return;
      }
      previewBox.hidden = false;
      previewBox.textContent = '';
      var p = document.createElement('p');
      p.textContent = text;
      previewBox.appendChild(p);
      setStatus('');
    });
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      var payload = {
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        website: String(data.get('website') || '').trim(),
        message: String(data.get('message') || '').trim(),
        hp: String(data.get('hp') || ''),
      };
      if (!payload.name || !payload.message) {
        setStatus('昵称和留言是必填的。', 'error');
        return;
      }
      sendBtn.disabled = true;
      setStatus('发送中…');
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (!res.ok) throw new Error(body.error || '发送失败，请稍后再试。');
            return body;
          });
        })
        .then(function (body) {
          if (body.message) {
            messages.unshift(body.message);
            render();
          }
          form.reset();
          if (countEl) countEl.textContent = '0 / 500';
          if (previewBox) previewBox.hidden = true;
          setStatus('留言已发布，谢谢！', 'ok');
        })
        .catch(function (err) {
          setStatus(err.message || '发送失败，请稍后再试。', 'error');
        })
        .finally(function () { sendBtn.disabled = false; });
    });
  }

  load();
})();