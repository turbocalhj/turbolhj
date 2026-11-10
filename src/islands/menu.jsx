import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * P3R 目的地选择器。
 * 列表 + 右侧目标面板共享同一份选中状态：鼠标悬停、键盘 ↑↓、数字键 1–4 都能切换，
 * 选中项变化时右侧面板用 key 触发一次入场动画，并预取对应页面。
 */
export default function MenuSelector({ items }) {
  const [sel, setSel] = useState(0);
  const links = useRef([]);
  const prefetched = useRef(new Set());
  const total = items.length;
  const active = items[sel];

  const go = useCallback((index) => {
    const el = links.current[index];
    if (el) el.click();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
      const overlay = document.getElementById('search-overlay');
      if (overlay && !overlay.hidden) return;

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSel((s) => {
          const next = (s + (e.key === 'ArrowDown' ? 1 : -1) + total) % total;
          const el = links.current[next];
          if (el) el.focus({ preventScroll: true });
          return next;
        });
      } else if (e.key === 'Enter') {
        if (e.target.closest('a')) return;
        e.preventDefault();
        go(sel);
      } else if (/^[1-9]$/.test(e.key)) {
        const i = Number(e.key) - 1;
        if (i < total) {
          e.preventDefault();
          setSel(i);
          go(i);
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, sel, total]);

  useEffect(() => {
    const href = active.href;
    if (prefetched.current.has(href)) return;
    prefetched.current.add(href);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    link.as = 'document';
    document.head.appendChild(link);
  }, [active]);

  return (
    <div className="p3r-menu-shell">
      <nav className="p3r-menu-list" aria-label="站点菜单">
        {items.map((it, i) => (
          <a
            key={it.n}
            ref={(el) => { links.current[i] = el; }}
            className={`p3r-menu-item${i === sel ? ' is-selected' : ''}`}
            href={it.href}
            aria-current={i === sel ? 'true' : undefined}
            onMouseEnter={() => setSel(i)}
            onFocus={() => setSel(i)}
          >
            <span className="p3r-menu-no">{it.n}</span>
            <span className="p3r-menu-label">
              {it.cn}
              <em>{it.en}</em>
            </span>
            <span className="p3r-menu-desc">{it.desc}</span>
            <span className="p3r-menu-arrow" aria-hidden="true">→</span>
          </a>
        ))}
      </nav>

      <aside className="p3r-target" aria-live="polite">
        <div className="p3r-target-head">
          <span>DESTINATION</span>
          <b>{active.n} / {String(total).padStart(2, '0')}</b>
        </div>
        <div className="p3r-target-no" key={`no-${active.n}`}>{active.n}</div>
        <h3 className="p3r-target-en" key={`en-${active.n}`}>{active.en}</h3>
        <p className="p3r-target-cn">{active.cn}</p>
        <p className="p3r-target-desc" key={`desc-${active.n}`}>{active.desc}</p>
        <a className="p3r-target-go" href={active.href}>
          ENTER <i aria-hidden="true">→</i>
        </a>
        <div className="p3r-target-bar">
          <i style={{ width: `${((sel + 1) / total) * 100}%` }} />
        </div>
        <span className="p3r-target-scan" aria-hidden="true" />
      </aside>
    </div>
  );
}
