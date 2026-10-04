import Dexie, { type EntityTable } from 'dexie'
import { uid } from './lib/uid'
import type { Climb, Wall, WallRevision } from './types'

export const db = new Dexie('homewall') as Dexie & {
  walls: EntityTable<Wall, 'id'>
  revisions: EntityTable<WallRevision, 'id'>
  climbs: EntityTable<Climb, 'id'>
}

db.version(1).stores({
  walls: 'id, createdAt',
  revisions: 'id, wallId, createdAt',
  climbs: 'id, revisionId, name, grade, createdAt, updatedAt',
})

/** There is exactly one wall; create it on first run. */
export async function ensureWall(): Promise<Wall> {
  const existing = await db.walls.orderBy('createdAt').first()
  if (existing) return existing
  const wall: Wall = { id: uid(), name: 'Home Wall', createdAt: Date.now() }
  await db.walls.add(wall)
  return wall
}

export async function getCurrentRevision(wallId: string): Promise<WallRevision | null> {
  const revisions = await db.revisions.where('wallId').equals(wallId).toArray()
  if (revisions.length === 0) return null
  revisions.sort((a, b) => b.createdAt - a.createdAt)
  return revisions[0]
}

export async function listRevisions(wallId: string): Promise<WallRevision[]> {
  const revisions = await db.revisions.where('wallId').equals(wallId).toArray()
  revisions.sort((a, b) => b.createdAt - a.createdAt)
  return revisions
}
