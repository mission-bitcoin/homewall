import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { db, ensureWall, getCurrentRevision } from '../db'
import WallCanvas from '../components/WallCanvas'
import { ROLES, ROLE_ORDER, roleLimitReached } from '../lib/roles'
import { uid } from '../lib/uid'
import type { Hold, Role, WallRevision } from '../types'

const DEFAULT_RADIUS = 0.03

export default function ClimbEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)

  const [ready, setReady] = useState(false)
  const [revision, setRevision] = useState<WallRevision | null>(null)
  const [holds, setHolds] = useState<Hold[]>([])
  const [name, setName] = useState('')
  const [grade, setGrade] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [addRole, setAddRole] = useState<Role>('hand')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      if (id) {
        const climb = await db.climbs.get(id)
        if (!climb) {
          if (alive) setReady(true)
          return
        }
        const rev = await db.revisions.get(climb.revisionId)
        if (!alive) return
        setRevision(rev ?? null)
        setHolds(climb.holds)
        setName(climb.name)
        setGrade(climb.grade)
        setNotes(climb.notes)
      } else {
        const wall = await ensureWall()
        const rev = await getCurrentRevision(wall.id)
        if (!alive) return
        setRevision(rev)
      }
      if (alive) setReady(true)
    })()
    return () => {
      alive = false
    }
  }, [id])

  const selected = useMemo(() => holds.find((h) => h.id === selectedId) ?? null, [holds, selectedId])

  function addHold(x: number, y: number) {
    if (roleLimitReached(addRole, holds)) {
      setMessage(`A climb can only have ${ROLES[addRole].max} ${ROLES[addRole].label.toLowerCase()} holds.`)
      return
    }
    const hold: Hold = { id: uid(), x, y, r: DEFAULT_RADIUS, role: addRole }
    setHolds((prev) => [...prev, hold])
    setSelectedId(hold.id)
    setMessage(null)
  }

  function changeRole(holdId: string, role: Role) {
    const others = holds.filter((h) => h.id !== holdId)
    if (roleLimitReached(role, others)) {
      setMessage(`A climb can only have ${ROLES[role].max} ${ROLES[role].label.toLowerCase()} holds.`)
      return
    }
    setHolds((prev) => prev.map((h) => (h.id === holdId ? { ...h, role } : h)))
    setMessage(null)
  }

  function resizeSelected(r: number) {
    if (!selectedId) return
    setHolds((prev) => prev.map((h) => (h.id === selectedId ? { ...h, r } : h)))
  }

  async function save() {
    if (!revision) return
    const now = Date.now()
    const cleanName = name.trim() || 'Untitled'
    if (id) {
      const existing = await db.climbs.get(id)
      if (!existing) return
      await db.climbs.put({ ...existing, name: cleanName, grade, notes, holds, updatedAt: now })
      navigate(`/climbs/${id}`)
    } else {
      const newId = uid()
      await db.climbs.add({
        id: newId,
        revisionId: revision.id,
        name: cleanName,
        grade,
        notes,
        holds,
        createdAt: now,
        updatedAt: now,
      })
      navigate(`/climbs/${newId}`)
    }
  }

  if (!ready) return <p className="muted">Loading…</p>
  if (!revision) {
    return (
      <section className="page">
        <p className="empty">
          There is no wall photo yet. <Link to="/">Add one first</Link>.
        </p>
      </section>
    )
  }

  return (
    <section className="page">
      <div className="page-head">
        <h1>{editing ? 'Edit climb' : 'New climb'}</h1>
        <span className="muted small">Tap the wall to place a hold · drag to move · pinch to zoom</span>
      </div>

      <div className="role-picker">
        <span className="muted small">Placing:</span>
        {ROLE_ORDER.map((role) => (
          <button
            key={role}
            className={`chip${addRole === role ? ' active' : ''}`}
            style={addRole === role ? { borderColor: ROLES[role].stroke } : undefined}
            onClick={() => setAddRole(role)}
          >
            <span className="role-dot" style={{ background: ROLES[role].stroke }} />
            {ROLES[role].label}
          </button>
        ))}
      </div>

      <div className="wall-frame tall">
        <WallCanvas
          image={revision.image}
          imageWidth={revision.width}
          imageHeight={revision.height}
          holds={holds}
          editable
          selectedId={selectedId}
          onSelect={setSelectedId}
          onAdd={addHold}
          onMove={(holdId, x, y) =>
            setHolds((prev) => prev.map((h) => (h.id === holdId ? { ...h, x, y } : h)))
          }
          onResize={(holdId, r) =>
            setHolds((prev) => prev.map((h) => (h.id === holdId ? { ...h, r } : h)))
          }
        />
      </div>

      {message && <p className="notice">{message}</p>}

      {selected && (
        <div className="card">
          <h2>Selected hold</h2>
          <div className="role-picker">
            {ROLE_ORDER.map((role) => (
              <button
                key={role}
                className={`chip${selected.role === role ? ' active' : ''}`}
                style={selected.role === role ? { borderColor: ROLES[role].stroke } : undefined}
                onClick={() => changeRole(selected.id, role)}
              >
                {ROLES[role].label}
              </button>
            ))}
          </div>
          <label className="slider">
            Size
            <input
              type="range"
              min={0.008}
              max={0.25}
              step={0.001}
              value={selected.r}
              onChange={(e) => resizeSelected(Number(e.target.value))}
            />
          </label>
          <button
            onClick={() => {
              setHolds((prev) => prev.filter((h) => h.id !== selected.id))
              setSelectedId(null)
            }}
          >
            Delete hold
          </button>
        </div>
      )}

      <div className="card">
        <h2>Details</h2>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Crimpy traverse" />
        </label>
        <label>
          V grade
          <select
            value={grade === null ? '' : String(grade)}
            onChange={(e) => setGrade(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">Unset</option>
            {Array.from({ length: 18 }, (_, i) => i).map((g) => (
              <option key={g} value={g}>
                V{g}
              </option>
            ))}
          </select>
        </label>
        <label>
          Notes
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Beta, holds to avoid, foot notes…"
          />
        </label>
      </div>

      <div className="actions sticky">
        <button className="primary" onClick={() => void save()}>
          Save climb
        </button>
        <button onClick={() => navigate(-1)}>Cancel</button>
      </div>
    </section>
  )
}
