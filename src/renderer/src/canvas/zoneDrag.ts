// src/renderer/src/canvas/zoneDrag.ts
import type { Project } from '../model/types'
import { zonesWithin } from '../model/zones'
import type { SelectionMoves } from '../store/projectStore'

type XY = { x: number; y: number }
type Dragged = { id: string; type?: string; position: XY }

export interface ZoneDrag {
  origins: Map<string, XY> // position de départ de chaque zone glissée
  // Zones emportées et appareils non sélectionnés, à déplacer nous-mêmes ; zoneId = zone glissée d'origine.
  members: Map<string, { zoneId: string; position: XY }>
}

export function startZoneDrag(project: Project, dragged: readonly Dragged[]): ZoneDrag | null {
  const zones = dragged.filter((n) => n.type === 'zone')
  if (zones.length === 0) return null
  const origins = new Map(zones.map((z) => [z.id, { ...z.position }]))
  const draggedIds = new Set(dragged.map((n) => n.id))
  const root = zonesWithin(project, [...origins.keys()])
  const members = new Map<string, { zoneId: string; position: XY }>()
  // Une zone emportée suit sa zone racine, comme dans le store.
  for (const z of project.zones) {
    const r = root.get(z.id)
    if (r && !draggedIds.has(z.id)) members.set(z.id, { zoneId: r, position: { x: z.rect.x, y: z.rect.y } })
  }
  for (const d of project.devices) {
    const r = d.zoneId ? root.get(d.zoneId) : undefined
    // Un membre sélectionné est déjà déplacé par React Flow : on ne le compte pas deux fois.
    if (r && !draggedIds.has(d.id)) members.set(d.id, { zoneId: r, position: { ...d.position } })
  }
  return { origins, members }
}

function deltas(zd: ZoneDrag, dragged: readonly Dragged[]): Map<string, XY> {
  const out = new Map<string, XY>()
  for (const n of dragged) {
    const o = zd.origins.get(n.id)
    if (o) out.set(n.id, { x: n.position.x - o.x, y: n.position.y - o.y })
  }
  return out
}

export function memberPositions(zd: ZoneDrag, dragged: readonly Dragged[]): Map<string, XY> {
  const d = deltas(zd, dragged)
  const out = new Map<string, XY>()
  for (const [id, m] of zd.members) {
    const delta = d.get(m.zoneId)
    if (delta) out.set(id, { x: m.position.x + delta.x, y: m.position.y + delta.y })
  }
  return out
}

export function selectionMoves(zd: ZoneDrag | null, dragged: readonly Dragged[]): SelectionMoves {
  const d = zd ? deltas(zd, dragged) : new Map<string, XY>()
  return {
    devices: dragged.filter((n) => n.type !== 'zone').map((n) => ({ id: n.id, position: n.position })),
    zones: dragged.filter((n) => n.type === 'zone').map((n) => ({ id: n.id, dx: d.get(n.id)?.x ?? 0, dy: d.get(n.id)?.y ?? 0 }))
  }
}
