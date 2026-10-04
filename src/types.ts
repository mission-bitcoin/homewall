export type Role = 'start' | 'hand' | 'foot' | 'handfoot' | 'finish'

export interface Hold {
  id: string
  /** normalised 0–1 across the image width */
  x: number
  /** normalised 0–1 down the image height */
  y: number
  /** circle radius normalised against the image width */
  r: number
  role: Role
}

export interface Wall {
  id: string
  name: string
  createdAt: number
}

export interface WallRevision {
  id: string
  wallId: string
  image: Blob
  width: number
  height: number
  label: string
  createdAt: number
}

export interface Climb {
  id: string
  /** the wall revision this climb was set on — never changes */
  revisionId: string
  name: string
  grade: number | null
  notes: string
  holds: Hold[]
  createdAt: number
  updatedAt: number
}
