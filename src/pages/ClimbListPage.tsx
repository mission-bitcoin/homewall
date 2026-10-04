import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import GradeBadge from '../components/GradeBadge'
import { ROLES } from '../lib/roles'

type SortKey = 'newest' | 'grade-asc' | 'grade-desc' | 'name'

export default function ClimbListPage() {
  const climbs = useLiveQuery(() => db.climbs.toArray(), [], undefined)
  const revisions = useLiveQuery(() => db.revisions.toArray(), [], undefined)

  const [query, setQuery] = useState('')
  const [minGrade, setMinGrade] = useState('')
  const [maxGrade, setMaxGrade] = useState('')
  const [sort, setSort] = useState<SortKey>('newest')

  const revisionLabel = useMemo(() => {
    const map = new Map<string, string>()
    for (const r of revisions ?? []) map.set(r.id, r.label)
    return map
  }, [revisions])

  const filtered = useMemo(() => {
    let list = [...(climbs ?? [])]
    const q = query.trim().toLowerCase()
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q))
    if (minGrade !== '') list = list.filter((c) => c.grade !== null && c.grade >= Number(minGrade))
    if (maxGrade !== '') list = list.filter((c) => c.grade !== null && c.grade <= Number(maxGrade))
    list.sort((a, b) => {
      switch (sort) {
        case 'grade-asc':
          return (a.grade ?? 99) - (b.grade ?? 99)
        case 'grade-desc':
          return (b.grade ?? -1) - (a.grade ?? -1)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return b.createdAt - a.createdAt
      }
    })
    return list
  }, [climbs, query, minGrade, maxGrade, sort])

  const gradeOptions = Array.from({ length: 18 }, (_, i) => i)

  return (
    <section className="page">
      <div className="page-head">
        <h1>Climbs</h1>
        <Link className="button primary" to="/climbs/new">
          New climb
        </Link>
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label>
          From
          <select value={minGrade} onChange={(e) => setMinGrade(e.target.value)}>
            <option value="">Any</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                V{g}
              </option>
            ))}
          </select>
        </label>
        <label>
          To
          <select value={maxGrade} onChange={(e) => setMaxGrade(e.target.value)}>
            <option value="">Any</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                V{g}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="newest">Newest</option>
            <option value="grade-asc">Grade ↑</option>
            <option value="grade-desc">Grade ↓</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      {climbs === undefined && <p className="muted">Loading…</p>}
      {climbs !== undefined && filtered.length === 0 && (
        <p className="empty">
          {climbs.length === 0 ? 'No climbs yet — set your first one.' : 'No climbs match those filters.'}
        </p>
      )}

      <ul className="climb-list">
        {filtered.map((c) => {
          const counts: Record<string, number> = {}
          for (const h of c.holds) counts[h.role] = (counts[h.role] ?? 0) + 1
          return (
            <li key={c.id}>
              <Link to={`/climbs/${c.id}`} className="climb-row">
                <GradeBadge grade={c.grade} />
                <span className="climb-main">
                  <span className="climb-name">{c.name}</span>
                  <span className="muted small">
                    {revisionLabel.get(c.revisionId) ?? 'Wall'} · {c.holds.length} holds
                    {counts.start ? ` · ${counts.start} start` : ''}
                  </span>
                </span>
                <span className="role-dots">
                  {Object.entries(counts).map(([role, n]) => (
                    <span
                      key={role}
                      className="role-dot"
                      style={{ background: ROLES[role as keyof typeof ROLES].stroke }}
                      title={`${n} × ${ROLES[role as keyof typeof ROLES].label}`}
                    />
                  ))}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
