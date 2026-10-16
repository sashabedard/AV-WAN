import type { Project, Rack } from '../model/types'
import { buildSwitchPorts } from '../catalog/switch'
import { switchFacade } from '../canvas/switchFacade'

// Échelle de la vue de baie (spec § 8.1) : 1U = la hauteur d'une façade de switch à deux rangées ;
// la largeur intérieure est celle de la façade la plus large (48 ports + 4 SFP+, le maximum du schéma).
// Les façades gardent leur taille du canvas : jamais compressées.
export const RACK_U_PX = 92
export const RACK_RAIL_W = 24
export const RACK_TITLE_H = 32
export const RACK_GAP = 96
export const RACK_INNER_W: number = switchFacade(buildSwitchPorts({ portCount: 48, poe: 'none', sfpPlus: 4, managed: true })).width
export const RACK_W = RACK_INNER_W + 2 * RACK_RAIL_W
// Bout de câble vers un appareil hors baie : étiquette posée à droite de la baie, à la hauteur du port.
// Une baie dont un câble sort réserve cette place avant la baie suivante (étiquette plus longue : coupée).
export const RACK_STUB_GAP = 28
export const RACK_STUB_H = 20
export const RACK_STUB_W = 200

export interface RackBox {
  id: string
  x: number
  y: number
  w: number
  h: number
}
export interface SlotBox {
  deviceId: string
  rackId: string
  x: number
  y: number
  w: number
  h: number
}

// Distance entre le haut du nœud de baie et le haut d'un appareil (U1 en bas ; `u` = U du bas de l'appareil).
export function slotTop(rack: Pick<Rack, 'heightU'>, u: number, heightU: number): number {
  return RACK_TITLE_H + (rack.heightU - (u + heightU - 1)) * RACK_U_PX
}

// Baies d'où sort au moins un câble vers un appareil hors baie.
function racksWithStubs(project: Project, known: ReadonlySet<string>): Set<string> {
  const rackOf = new Map<string, string>()
  for (const d of project.devices) if (d.rack && known.has(d.rack.rackId)) rackOf.set(d.id, d.rack.rackId)
  const out = new Set<string>()
  for (const l of project.links) {
    const a = rackOf.get(l.a.deviceId)
    const b = rackOf.get(l.b.deviceId)
    if (a && !b) out.add(a)
    if (b && !a) out.add(b)
  }
  return out
}

// Baies côte à côte dans l'ordre de project.racks, alignées par le haut ; un appareil dont la baie
// n'existe pas n'a pas de fente.
export function layoutRacks(project: Project): { racks: RackBox[]; slots: SlotBox[] } {
  const racks: RackBox[] = []
  const byId = new Map<string, { rack: Rack; box: RackBox }>()
  const stubbed = racksWithStubs(project, new Set((project.racks ?? []).map((r) => r.id)))
  let x = 0
  for (const rack of project.racks ?? []) {
    const box: RackBox = { id: rack.id, x, y: 0, w: RACK_W, h: rack.heightU * RACK_U_PX + RACK_TITLE_H }
    racks.push(box)
    byId.set(rack.id, { rack, box })
    x += box.w + RACK_GAP + (stubbed.has(rack.id) ? RACK_STUB_GAP + RACK_STUB_W : 0)
  }
  const slots: SlotBox[] = []
  for (const device of project.devices) {
    const at = device.rack
    const hit = at && byId.get(at.rackId)
    if (!at || !hit) continue
    slots.push({
      deviceId: device.id,
      rackId: at.rackId,
      x: hit.box.x + RACK_RAIL_W,
      y: hit.box.y + slotTop(hit.rack, at.u, at.heightU),
      w: RACK_INNER_W,
      h: at.heightU * RACK_U_PX
    })
  }
  return { racks, slots }
}

// U du bas d'un appareil de `heightU` déposé au point (coordonnées du flux) : l'U sous le point,
// abaissé si le haut de l'appareil sortait de la baie. Hors des U d'une baie (titre compris) : null.
export function rackAt(project: Project, point: { x: number; y: number }, heightU: number): { rackId: string; u: number } | null {
  const { racks } = layoutRacks(project)
  for (const box of racks) {
    const rack = project.racks?.find((r) => r.id === box.id)
    const top = box.y + RACK_TITLE_H
    if (!rack || point.x < box.x || point.x >= box.x + box.w || point.y < top || point.y >= box.y + box.h) continue
    const pointed = rack.heightU - Math.floor((point.y - top) / RACK_U_PX)
    return { rackId: rack.id, u: Math.max(1, Math.min(pointed, rack.heightU - heightU + 1)) }
  }
  return null
}
