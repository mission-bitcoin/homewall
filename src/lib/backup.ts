import { db } from '../db'
import { blobToDataUrl, dataUrlToBlob } from './image'
import type { Climb, Wall, WallRevision } from '../types'

interface BackupPayload {
  app: 'homewall'
  version: 1
  exportedAt: number
  wall: Wall
  revisions: Array<Omit<WallRevision, 'image'> & { image: string }>
  climbs: Climb[]
}

export async function exportBackup(): Promise<Blob> {
  const wall = await db.walls.orderBy('createdAt').first()
  if (!wall) throw new Error('No wall to export yet')
  const revisions = await db.revisions.where('wallId').equals(wall.id).toArray()
  const climbs = await db.climbs.toArray()

  const payload: BackupPayload = {
    app: 'homewall',
    version: 1,
    exportedAt: Date.now(),
    wall,
    revisions: await Promise.all(
      revisions.map(async (r) => ({ ...r, image: await blobToDataUrl(r.image) })),
    ),
    climbs,
  }
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
}

export async function downloadBackup(): Promise<void> {
  const blob = await exportBackup()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `homewall-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function importBackup(file: File): Promise<{ climbs: number; revisions: number }> {
  const data = JSON.parse(await file.text()) as BackupPayload
  if (data.app !== 'homewall' || !Array.isArray(data.revisions) || !data.wall) {
    throw new Error('That is not a HomeWall backup file')
  }

  const revisions: WallRevision[] = []
  for (const r of data.revisions) {
    revisions.push({ ...r, image: await dataUrlToBlob(r.image) })
  }

  await db.transaction('rw', db.walls, db.revisions, db.climbs, async () => {
    await db.walls.put(data.wall)
    await db.revisions.bulkPut(revisions)
    if (data.climbs?.length) await db.climbs.bulkPut(data.climbs)
  })

  return { climbs: data.climbs?.length ?? 0, revisions: revisions.length }
}
