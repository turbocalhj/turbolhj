import { useMemo, useState } from 'react';

export default function EsportsBoard({ titles = [], events = [], teams = [], milestones = [], players = [], posters = [] }) {
  const [active, setActive] = useState('all');
  const titleMap = useMemo(() => new Map(titles.map((t) => [t.key, t])), [titles]);

  const filteredEvents = active === 'all' ? events : events.filter((e) => e.title === active);
  const filteredTeams = active === 'all' ? teams : teams.filter((t) => t.title === active);
  const filteredPlayers = active === 'all' ? players : players.filter((p) => p.title === active);
  const filteredPosters = active === 'all' ? posters : posters.filter((p) => p.title === active);

  const colorOf = (key) => titleMap.get(key)?.color || '#7fd4ff';
  const nameOf = (key) => titleMap.get(key)?.short || key;

  return (
    <div className="esports-board">
      <div className="esports-switch" role="group" aria-label="筛选电竞项目">
        <button type="button" className={active === 'all' ? 'is-active' : ''} onClick={() => setActive('all')}>全部项目</button>
        {titles.map((t) => (
          <button
            key={t.key}
            type="button"
            className={active === t.key ? 'is-active' : ''}
            style={{ '--title-color': t.color }}
            onClick={() => setActive(t.key)}
          >{t.name}</button>
        ))}
      </div>

      <div className="esports-section-head">
        <div><span className="eyebrow">EVENTS / 赛事体系</span><h2>赛历与赛制</h2></div>
        <span className="esports-count">{filteredEvents.length} 项赛事</span>
      </div>
      <div className="event-grid">
        {filteredEvents.map((e) => (
          <article className="event-card" key={e.en} style={{ '--title-color': colorOf(e.title) }}>
            <div className="event-top">
              <span className="event-title-tag">{nameOf(e.title)}</span>
              <span className={`event-tier tier-${e.tier}`}>{e.tier} 级</span>
            </div>
            <h3>{e.name}</h3>
            <p className="event-en">{e.en}</p>
            <p className="event-desc">{e.desc}</p>
            <dl className="event-facts">
              <div><dt>周期</dt><dd>{e.cycle}</dd></div>
              <div><dt>赛制</dt><dd>{e.format}</dd></div>
              <div><dt>关注</dt><dd>{e.watch}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <div className="esports-section-head">
        <div><span className="eyebrow">TEAMS / 战队观察</span><h2>值得关注的队伍</h2></div>
        <span className="esports-count">{filteredTeams.length} 支队伍</span>
      </div>
      <div className="team-grid">
        {filteredTeams.map((t) => (
          <article className="team-card" key={`${t.title}-${t.name}`} style={{ '--team-color': t.color }}>
            <span className="team-emblem">{t.short}</span>
            <div className="team-body">
              <h3>{t.name}</h3>
              <p className="team-region">{t.region} · {nameOf(t.title)}</p>
              <p className="team-desc">{t.desc}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="esports-section-head">
        <div><span className="eyebrow">PLAYERS / 职业选手</span><h2>选手档案</h2></div>
        <span className="esports-count">{filteredPlayers.length} 名选手 · LIQUIPEDIA</span>
      </div>
      <div className="player-grid">
        {filteredPlayers.map((p) => (
          <a className="player-card" key={`${p.game}-${p.id}`} href={p.url} target="_blank" rel="noopener" style={{ '--title-color': colorOf(p.title) }}>
            <span className="player-avatar" aria-hidden="true">{p.id.slice(0, 2).toUpperCase()}</span>
            <span className="player-body">
              <b>{p.id}</b>
              <em>{p.name}</em>
              <span>{p.team} · {p.role}</span>
              <small>{p.country}</small>
            </span>
          </a>
        ))}
      </div>

      <div className="esports-section-head">
        <div><span className="eyebrow">POSTERS / 官方视觉</span><h2>赛事海报</h2></div>
        <span className="esports-count">{filteredPosters.length} 张 · LIQUIPEDIA</span>
      </div>
      <div className="poster-grid">
        {filteredPosters.map((p) => (
          <a className="poster-card" key={`${p.title}-${p.en}-${p.year}`} href={p.url} target="_blank" rel="noopener" style={{ '--title-color': colorOf(p.title) }}>
            <span className="poster-art">
              <span className="poster-year">{p.year}</span>
              <b>{p.en}</b>
              <em>{p.tag}</em>
            </span>
            <span className="poster-meta"><b>{p.name}</b><span>{nameOf(p.title)} · LIQUIPEDIA ↗</span></span>
          </a>
        ))}
      </div>

      <div className="esports-section-head">
        <div><span className="eyebrow">MILESTONES / 时间线</span><h2>电竞记忆点</h2></div>
      </div>
      <ol className="milestone-list">
        {milestones
          .filter((m) => active === 'all' || m.titleKey === active)
          .map((m) => (
            <li key={m.year + m.title} style={{ '--title-color': colorOf(m.titleKey) }}>
              <span className="milestone-year">{m.year}</span>
              <div className="milestone-body">
                <h3>{m.title}</h3>
                <p>{m.desc}</p>
              </div>
            </li>
          ))}
      </ol>
    </div>
  );
}