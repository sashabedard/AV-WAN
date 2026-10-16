import type { Device, Project, Zone } from './types'
import { estimateNodeSize, type SizeOf } from './layout'
import { newId } from './project'

export type ZoneRect = Zone['rect']
type XY = { x: number; y: number }

export const ZONE_COLORS = ['#3E8EF7', '#3DBE6E', '#F2A93B', '#A78BFA', '#E86FB0', '#36C2C9'] as const
export const ZONE_PAD = 24 // marge autour des appareils
export const ZONE_TITLE = 28 // bande du nom, en haut de la zone
export const ZONE_DEFAULT = { w: 480, h: 320 } as const

export function nextZoneName(project: Project): string {
  const names = new Set(project.zones.map((z) => z.name))
  let n = project.zones.length + 1
  while (names.has(`Zone ${n}`)) n++
  return `Zone ${n}`
}

export function createZone(project: Project, rect: ZoneRect, opts: { name?: string; id?: string } = {}): Zone {
  return {
    id: opts.id ?? newId(),
    name: opts.name ?? nextZoneName(project),
    color: ZONE_COLORS[project.zones.length % ZONE_COLORS.length]!,
    rect: { ...rect },
    ownPdfPage: false
  }
}

export function zoneAround(project: Project, deviceIds: readonly string[], sizeOf: SizeOf = estimateNodeSize): ZoneRect | null {
  const ids = new Set(deviceIds)
  const devices = project.devices.filter((d) => ids.has(d.id))
  if (devices.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const d of devices) {
    const { w, h } = sizeOf(d)
    minX = Math.min(minX, d.position.x)
    minY = Math.min(minY, d.position.y)
    maxX = Math.max(maxX, d.position.x + w)
    maxY = Math.max(maxY, d.position.y + h)
  }
  return { x: minX - ZONE_PAD, y: minY - ZONE_PAD - ZONE_TITLE, w: maxX - minX + 2 * ZONE_PAD, h: maxY - minY + 2 * ZONE_PAD + ZONE_TITLE }
}

const contains = (r: ZoneRect, p: XY): boolean => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h

// La plus petite zone qui contient le point (une zone peut en contenir une autre).
export function zoneAt(project: Project, point: XY): Zone | undefined {
  let best: Zone | undefined
  for (const z of project.zones) {
    if (!contains(z.rect, point)) continue
    if (!best || z.rect.w * z.rect.h < best.rect.w * best.rect.h) best = z
  }
  return best
}

// Appartenance selon le centre de la tuile. Sans changement, rend le même objet (pas d'entrée d'historique).
export function assignZones(project: Project, deviceIds?: readonly string[], sizeOf: SizeOf = estimateNodeSize): Project {
  const only = deviceIds ? new Set(deviceIds) : null
  let changed = false
  const devices = project.devices.map((d): Device => {
    if (only && !only.has(d.id)) return d
    const { w, h } = sizeOf(d)
    const zoneId = zoneAt(project, { x: d.position.x + w / 2, y: d.position.y + h / 2 })?.id
    if (zoneId === d.zoneId) return d
    changed = true
    if (zoneId === undefined) {
      const { zoneId: _old, ...rest } = d
      return rest
    }
    return { ...d, zoneId }
  })
  return changed ? { ...project, devices } : project
}

export function placeDevices(project: Project, moves: ReadonlyArray<{ id: string; position: XY }>): Project {
  const target = new Map(moves.map((m) => [m.id, m.position]))
  let changed = false
  const devices = project.devices.map((d) => {
    const pos = target.get(d.id)
    if (!pos || (pos.x === d.position.x && pos.y === d.position.y)) return d
    changed = true
    return { ...d, position: { x: pos.x, y: pos.y } }
  })
  return changed ? { ...project, devices } : project
}

// Zones emportées par les zones déplacées : une zone entièrement dans une zone emportée suit (en cascade).
// Chaque zone emportée est associée à la zone déplacée dont elle prend le décalage.
export function zonesWithin(project: Project, ids: readonly string[]): Map<string, string> {
  const root = new Map<string, string>()
  for (const id of ids) root.set(id, id)
  const rectOf = new Map(project.zones.map((z) => [z.id, z.rect]))
  const inside = (inner: ZoneRect, outer: ZoneRect): boolean =>
    inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.w <= outer.x + outer.w && inner.y + inner.h <= outer.y + outer.h
  let grew = true
  while (grew) {
    grew = false
    for (const z of project.zones) {
      if (root.has(z.id)) continue
      for (const [carried, rootId] of [...root]) {
        const outer = rectOf.get(carried)
        if (outer && inside(z.rect, outer)) {
          root.set(z.id, rootId)
          grew = true
          break
        }
      }
    }
  }
  return root
}

// Déplace des zones, leurs zones emportées et leurs membres, du même décalage que la zone déplacée.
export function moveZones(project: Project, moves: ReadonlyArray<{ id: string; dx: number; dy: number }>): Project {
  const moving = moves.filter((m) => m.dx !== 0 || m.dy !== 0)
  if (moving.length === 0) return project
  const deltas = new Map(moving.map((m) => [m.id, m]))
  const root = zonesWithin(project, moving.map((m) => m.id))
  const deltaOf = (zoneId: string): { dx: number; dy: number } | undefined => {
    const r = root.get(zoneId)
    return r === undefined ? undefined : deltas.get(r)
  }
  return {
    ...project,
    zones: project.zones.map((z) => {
      const m = deltaOf(z.id)
      return m ? { ...z, rect: { ...z.rect, x: z.rect.x + m.dx, y: z.rect.y + m.dy } } : z
    }),
    devices: project.devices.map((d) => {
      const m = d.zoneId ? deltaOf(d.zoneId) : undefined
      return m ? { ...d, position: { x: d.position.x + m.dx, y: d.position.y + m.dy } } : d
    })
  }
}

// Supprimer une zone garde ses appareils, qui deviennent libres (spec § 9.2).
export function removeZones(project: Project, ids: readonly string[]): Project {
  const gone = new Set(ids)
  if (!project.zones.some((z) => gone.has(z.id))) return project
  return {
    ...project,
    zones: project.zones.filter((z) => !gone.has(z.id)),
    devices: project.devices.map((d) => {
      if (!d.zoneId || !gone.has(d.zoneId)) return d
      const { zoneId: _old, ...rest } = d
      return rest
    }),
    ...(project.racks
      ? {
          racks: project.racks.map((r) => {
            if (!r.zoneId || !gone.has(r.zoneId)) return r
            const { zoneId: _old, ...rest } = r
            return rest
          })
        }
      : {})
  }
}

export function resizeZone(project: Project, id: string, rect: ZoneRect, sizeOf: SizeOf = estimateNodeSize): Project {
  if (!project.zones.some((z) => z.id === id)) return project
  return assignZones({ ...project, zones: project.zones.map((z) => (z.id === id ? { ...z, rect: { ...rect } } : z)) }, undefined, sizeOf)
}
