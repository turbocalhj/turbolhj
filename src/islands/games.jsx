import { useMemo, useState } from 'react';

const SORTS = [
  { key: 'rating', label: '评分' },
  { key: 'year', label: '年份' },
  { key: 'hours', label: '时长' },
  { key: 'name', label: '名称' },
];

const statusKey = (s) => ({
  '已通关': 'clear',
  '在玩': 'playing',
  '偶尔玩': 'casual',
  '想玩': 'wish',
}[s] || 'other');

function Chips({ label, items, value, onChange }) {
  return (
    <div className="filter-group">
      <span className="filter-label">{label}</span>
      <div className="filter-chips">
        {['全部', ...items].map((item) => (
          <button
            key={item}
            type="button"
            className={`filter-chip${value === item ? ' is-active' : ''}`}
            onClick={() => onChange(item)}
            aria-pressed={value === item}
          >{item}</button>
        ))}
      </div>
    </div>
  );
}

export default function GameLibrary({ games, genres, platforms, statuses }) {
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('全部');
  const [platform, setPlatform] = useState('全部');
  const [status, setStatus] = useState('全部');
  const [sort, setSort] = useState('rating');
  const [desc, setDesc] = useState(true);
  const [view, setView] = useState('grid');

  const shown = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = games.filter((g) => {
      if (query) {
        const hay = [g.name, g.en, g.short, g.developer, ...g.genres, ...g.platforms, ...g.tags].join(' ').toLowerCase();
        if (!hay.includes(query)) return false;
      }
      if (genre !== '全部' && !g.genres.includes(genre)) return false;
      if (platform !== '全部' && !g.platforms.includes(platform)) return false;
      if (status !== '全部' && g.status !== status) return false;
      return true;
    });
    return list.sort((a, b) => {
      let r = 0;
      if (sort === 'name') r = a.name.localeCompare(b.name, 'zh');
      else r = (b[sort] ?? 0) - (a[sort] ?? 0);
      return desc ? r : -r;
    });
  }, [games, q, genre, platform, status, sort, desc]);

  const totalHours = shown.reduce((n, g) => n + (g.hours || 0), 0);
  const avg = shown.length ? (shown.reduce((n, g) => n + (g.rating || 0), 0) / shown.length).toFixed(1) : '—';

  return (
    <div className="game-library">
      <div className="game-toolbar">
        <label className="game-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索游戏名、开发商、标签…"
            aria-label="搜索游戏库"
            autoComplete="off"
            spellCheck="false"
          />
          {q ? <button type="button" className="game-clear" onClick={() => setQ('')} aria-label="清空搜索">×</button> : null}
        </label>
        <div className="game-view-switch" role="group" aria-label="切换视图">
          <button type="button" className={view === 'grid' ? 'is-active' : ''} onClick={() => setView('grid')} aria-label="网格视图">▦</button>
          <button type="button" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} aria-label="列表视图">☰</button>
        </div>
      </div>

      <div className="game-filters">
        <Chips label="类型" items={genres} value={genre} onChange={setGenre} />
        <Chips label="平台" items={platforms} value={platform} onChange={setPlatform} />
        <Chips label="状态" items={statuses} value={status} onChange={setStatus} />
      </div>

      <div className="game-summary">
        <span>命中 <b>{shown.length}</b> / {games.length} 款</span>
        <span>累计 <b>{totalHours.toLocaleString('en')}</b> 小时</span>
        <span>平均 <b>{avg}</b> 分</span>
        <div className="game-sorts">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`game-sort${sort === s.key ? ' is-active' : ''}`}
              onClick={() => { if (sort === s.key) setDesc(!desc); else { setSort(s.key); setDesc(true); } }}
            >{s.label}{sort === s.key ? (desc ? ' ↓' : ' ↑') : ''}</button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <div className={`game-grid game-grid--${view}`}>
          {shown.map((g) => (
            <a
              key={g.slug}
              className="game-card"
              href={g.href}
              style={{ '--game-accent': g.accent }}
            >
              <div className="game-cover">
                <span className="game-cover-glow" aria-hidden="true" />
                <span className="game-cover-short">{g.short}</span>
                <span className="game-cover-year">{g.year}</span>
                <span className={`game-status game-status--${statusKey(g.status)}`}>{g.status}</span>
              </div>
              <div className="game-info">
                <div className="game-title-row">
                  <h3>{g.name}</h3>
                  <span className="game-rating">{g.rating.toFixed(1)}</span>
                </div>
                <p className="game-en">{g.en}</p>
                <p className="game-meta">{g.developer} · {g.platforms.slice(0, 2).join(' / ')}</p>
                <div className="game-tags">{g.genres.map((x) => <span key={x}>{x}</span>)}</div>
                <div className="game-foot">
                  <span>{g.hours ? `${g.hours} 小时` : '未开始'}</span>
                  <span aria-hidden="true">详情 →</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div className="game-empty">
          <span aria-hidden="true">◌</span>
          <p>没有匹配的游戏，换个筛选条件试试。</p>
          <button type="button" onClick={() => { setQ(''); setGenre('全部'); setPlatform('全部'); setStatus('全部'); }}>重置筛选</button>
        </div>
      )}
    </div>
  );
}
