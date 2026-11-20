import { useMemo, useState } from 'react';

/**
 * 知识库分区浏览：技术笔记与项目档案分组展示，支持实时筛选与按需展开。
 * 未输入关键词时每个分区只展示前 12 篇，展开后显示全部。
 */
export default function KnowledgeExplorer({ groups, folders }) {
  const source = useMemo(
    () => (groups && groups.length ? groups : [{ key: 'all', title: '分区', sub: '', folders: folders || [] }]),
    [groups, folders],
  );
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(() => new Set());
  const query = q.trim().toLowerCase();

  const shown = useMemo(() => {
    if (!query) return source;
    return source
      .map((g) => {
        const list = g.folders
          .map((f) => {
            const labelHit = f.label.toLowerCase().includes(query)
              || (f.desc || '').toLowerCase().includes(query);
            const notes = f.notes.filter((n) => n.base.toLowerCase().includes(query));
            return { ...f, labelHit, notes: labelHit ? f.notes : notes };
          })
          .filter((f) => f.labelHit || f.notes.length);
        return { ...g, folders: list };
      })
      .filter((g) => g.folders.length);
  }, [source, query]);

  const total = source.reduce((n, g) => n + g.folders.length, 0);
  const hit = shown.reduce((n, g) => n + g.folders.length, 0);

  const toggle = (key) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  return (
    <div className="kb-explorer">
      <div className="kb-toolbar">
        <label className="kb-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="筛选分区或笔记名…"
            aria-label="筛选知识库分区"
            autoComplete="off"
            spellCheck="false"
          />
        </label>
        <span className="kb-count">
          {hit} / {total} 分区
          {query ? ` · ${shown.reduce((n, g) => n + g.folders.reduce((m, f) => m + f.notes.length, 0), 0)} 条命中` : ''}
        </span>
      </div>

      {shown.map((g) => (
        <section className="kb-group" key={g.key}>
          {g.title ? (
            <header className="kb-group-head">
              <h2>{g.title}</h2>
              {g.sub ? <p>{g.sub}</p> : ''}
              <span>{g.folders.length} 个分区</span>
            </header>
          ) : ''}
          <div className="grid grid-2">
            {g.folders.map((f) => {
              const openKey = `${g.key}:${f.key}`;
              const expanded = open.has(openKey) || !!query;
              const visible = expanded ? f.notes : f.notes.slice(0, 12);
              const hidden = f.notes.length - visible.length;
              return (
                <article className="foldercard" key={f.key}>
                  <header>
                    <h3><a href={f.href}>{f.label}</a></h3>
                    <span className="count">{f.count}</span>
                  </header>
                  {f.desc ? <p>{f.desc}</p> : ''}
                  <div className="foldercard-notes">
                    {visible.map((n) => <a key={n.href} href={n.href}>{n.base}</a>)}
                    {hidden > 0 ? (
                      <button type="button" className="more" onClick={() => toggle(openKey)}>
                        {`展开其余 ${hidden} 篇 ↓`}
                      </button>
                    ) : ''}
                    {expanded && !query && f.notes.length > 12 ? (
                      <a className="more" href={f.more}>进入分区页 →</a>
                    ) : ''}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      {shown.length ? '' : (
        <p className="kb-empty">没有匹配「{q.trim()}」的分区或笔记。</p>
      )}
    </div>
  );
}
