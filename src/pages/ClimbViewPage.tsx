import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import GradeBadge from '../components/GradeBadge'
import WallCanvas from '../components/WallCanvas'
import { ROLES, ROLE_ORDER } from '../lib/roles'
import type { WallRevision } from '../types'

export default function ClimbViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const climb = useLiveQuery(
    async () => (id ? await db.climbs.get(id) : undefined),
    [id],
    undefined,
  )
  const [revision, setRevision] = useState<WallRevision | null>(null)

  useEffect(() => {
    let alive = true
    if (!climb) return
    void db.revisions.get(climb.revisionId).then((r) => {
      if (alive) setRevision(r ?? null)
    })
    return () => {
      alive = false
    }
  }, [climb])

  async function remove() {
    if (!id) return
    if (!confirm('Delete this climb?')) return
    await db.climbs.delete(id)
    navigate('/climbs')
  }

  if (!climb) return <p className="muted">Loading…</p>

  return (
    <section className="page">
      <div className="page-head">
        <h1>
          <GradeBadge grade={climb.grade} /> {climb.name}
        </h1>
        <div className="actions">
          <Link className="button" to={`/climbs/${climb.id}/edit`}>
            Edit
          </Link>
          <button onClick={() => void remove()}>Delete</button>
        </div>
      </div>

      <div className="legend">
        {ROLE_ORDER.map((role) => (
          <span key={role} className="legend-item">
            <span className="role-dot" style={{ background: ROLES[role].stroke }} />
            {ROLES[role].label}
          </span>
        ))}
      </div>

      {revision ? (
        <div className="wall-frame">
          <WallCanvas
            image={revision.image}
            imageWidth={revision.width}
            imageHeight={revision.height}
            holds={climb.holds}
          />
        </div>
      ) : (
        <p className="muted">Wall photo for this climb is missing.</p>
      )}

      {revision && (
        <p className="muted small">Set on {revision.label}. Zoom with two fingers.</p>
      )}

      {climb.notes && (
        <div className="card">
          <h2>Notes</h2>
          <p className="notes">{climb.notes}</p>
        </div>
      )}
    </section>
  )
}
