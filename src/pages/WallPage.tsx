import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, ensureWall, getCurrentRevision } from '../db'
import { downscaleImage } from '../lib/image'
import { uid } from '../lib/uid'
import { downloadBackup, importBackup } from '../lib/backup'
import WallCanvas from '../components/WallCanvas'

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WallPage() {
  const wall = useLiveQuery(() => db.walls.orderBy('createdAt').first(), [], undefined)
  const revision = useLiveQuery(
    () => (wall ? getCurrentRevision(wall.id) : Promise.resolve(null)),
    [wall?.id],
    undefined,
  )
  const revisionCount = useLiveQuery(
    () => (wall ? db.revisions.where('wallId').equals(wall.id).count() : Promise.resolve(0)),
    [wall?.id],
    0,
  )

  const photoInput = useRef<HTMLInputElement>(null)
  const backupInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    // Create the wall here (a write). Doing this inside useLiveQuery throws
    // ReadOnlyError, because liveQuery runs its querier in a read-only transaction.
    void ensureWall()
    void navigator.storage?.persist?.()
  }, [])

  async function onPhoto(file: File) {
    if (!wall) return
    setBusy(true)
    setMessage(null)
    try {
      const count = await db.revisions.where('wallId').equals(wall.id).count()
      const { blob, width, height } = await downscaleImage(file)
      await db.revisions.add({
        id: uid(),
        wallId: wall.id,
        image: blob,
        width,
        height,
        label: `Wall v${count + 1}`,
        createdAt: Date.now(),
      })
      setMessage('Wall photo saved. New climbs will use it; existing climbs keep their original photo.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save the photo')
    } finally {
      setBusy(false)
      if (photoInput.current) photoInput.current.value = ''
    }
  }

  async function onImport(file: File) {
    setBusy(true)
    setMessage(null)
    try {
      const result = await importBackup(file)
      setMessage(`Imported ${result.climbs} climbs and ${result.revisions} wall photo(s).`)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBusy(false)
      if (backupInput.current) backupInput.current.value = ''
    }
  }

  return (
    <section className="page">
      <div className="page-head">
        <h1>{wall?.name ?? 'Home Wall'}</h1>
        {revision && <span className="muted">{revision.label} · {formatDate(revision.createdAt)}</span>}
      </div>

      <div className="actions">
        <button className="primary" disabled={busy} onClick={() => photoInput.current?.click()}>
          {revision ? 'Update wall photo' : 'Add wall photo'}
        </button>
        {revision && revisionCount > 1 && (
          <span className="muted">{revisionCount} photos in history</span>
        )}
      </div>

      <input
        ref={photoInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void onPhoto(f)
        }}
      />

      {revision ? (
        <div className="wall-frame">
          <WallCanvas
            image={revision.image}
            imageWidth={revision.width}
            imageHeight={revision.height}
            holds={[]}
          />
        </div>
      ) : (
        <p className="empty">No wall photo yet — add one to get started.</p>
      )}

      <div className="card">
        <h2>Backup</h2>
        <p className="muted">
          Everything is stored on this device. Export a file to back it up or move to a new phone.
        </p>
        <div className="actions">
          <button disabled={busy || !revision} onClick={() => void downloadBackup()}>
            Export backup
          </button>
          <button disabled={busy} onClick={() => backupInput.current?.click()}>
            Import backup
          </button>
        </div>
        <input
          ref={backupInput}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onImport(f)
          }}
        />
      </div>

      {message && <p className="notice">{message}</p>}
    </section>
  )
}
