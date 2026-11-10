import { useState } from 'react';

const reduce = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * 精选作品：保留静态卡片结构，额外加上指针视差倾斜与编号扫光。
 * 指针数据直接写进 CSS 变量，不触发 React 重渲染。
 */
export default function WorksShowcase({ items }) {
  const [hot, setHot] = useState(-1);

  const tilt = (e) => {
    if (reduce) return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', `${(px * 9).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${(-py * 9).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };

  const reset = (e) => {
    const el = e.currentTarget;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
  };

  return (
    <div className="p3r-works" onMouseLeave={() => setHot(-1)}>
      {items.map((w, i) => (
        <a
          key={w.href}
          className={`p3r-work${hot === i ? ' is-hot' : ''}`}
          href={w.href}
          onPointerMove={tilt}
          onPointerLeave={reset}
          onMouseEnter={() => setHot(i)}
        >
          <span className="p3r-work-no">{w.no}</span>
          <span className="p3r-work-cat">{w.cat}</span>
          <h3>{w.title}</h3>
          <p>{w.tagline}</p>
          <span className="p3r-work-more">
            VIEW FILE <i aria-hidden="true">→</i>
          </span>
        </a>
      ))}
    </div>
  );
}
