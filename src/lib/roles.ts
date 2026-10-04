import type { Role } from '../types'

export interface RoleMeta {
  label: string
  stroke: string
  fill: string
  /** maximum number of holds allowed with this role (undefined = unlimited) */
  max?: number
}

export const ROLES: Record<Role, RoleMeta> = {
  start: { label: 'Start', stroke: '#22c55e', fill: 'rgba(34,197,94,0.28)', max: 2 },
  hand: { label: 'Hand', stroke: '#3b82f6', fill: 'rgba(59,130,246,0.28)' },
  foot: { label: 'Foot', stroke: '#eab308', fill: 'rgba(234,179,8,0.28)' },
  handfoot: { label: 'Hand + foot', stroke: '#a855f7', fill: 'rgba(168,85,247,0.28)' },
  finish: { label: 'Finish', stroke: '#ef4444', fill: 'rgba(239,68,68,0.28)', max: 2 },
}

export const ROLE_ORDER: Role[] = ['start', 'hand', 'foot', 'handfoot', 'finish']

export function roleLimitReached(role: Role, holds: { role: Role }[]): boolean {
  const max = ROLES[role].max
  if (max === undefined) return false
  return holds.filter((h) => h.role === role).length >= max
}
