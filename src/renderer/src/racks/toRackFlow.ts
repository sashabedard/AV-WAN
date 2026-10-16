import type { Node } from '@xyflow/react'
import type { Device, DeviceTemplate, Link, PortRef, Project, Rack } from '../model/types'
import { messages, type Messages } from '../../../shared/i18n/messages'
import { LANGS, type Lang } from '../../../shared/i18n/lang'
import type { ThemeMode } from '../canvas/cordStyle'
import { analyzeLinks, createFlowCache, toFlowEdges, toFlowNodes, type CordEdgeData, type CordFlowEdge, type DeviceFlowNode, type PortInfo } from '../canvas/toFlow'
import { switchFacade } from '../canvas/switchFacade'
import { portOffset } from '../canvas/nodeGeometry'
import { findPort, isPatchPanel, portDisplayLabel } from '../model/rules'
import { RACK_STUB_GAP, RACK_STUB_H, RACK_U_PX, layoutRacks, slotTop, type RackBox, type SlotBox } from './rackLayout'

// Plage d'U libres, du haut vers le bas ; `y` et `h` sont relatifs au nœud de la baie.
export interface FreeSpan {
  y: number
  h: number
  n: number
}
export type RackNodeData = { rack: Rack; zoneName?: string; free: FreeSpan[] }
export type RackDeviceData = { device: Device; template: DeviceTemplate | undefined; ports: Record<string, PortInfo>; vlans: number[]; heightU: number }
export type StubData = { linkId: string; cableId: string; rackId: string; label: string; color: string }
export type RackFlowNode = Node<RackNodeData, 'rack'> | DeviceFlowNode | Node<RackDeviceData, 'rackDevice'> | Node<StubData, 'stub'>
export interface RackFlow {
  nodes: RackFlowNode[]
  edges: CordFlowEdge[]
}

// Seule poignée d'un bout de câble.
export const STUB_HANDLE = 'stub'
// Les cordons passent au-dessus des façades (variante B : câbles dessinés sur l'avant de la baie).
const CORD_Z = 1

const portKey = (r: PortRef): string => `${r.deviceId}\u0000${r.portId}`

// Les dictionnaires sont des constantes : la langue se retrouve par identité.
const langOf = (m: Messages): Lang => LANGS.find((l) => messages(l) === m) ?? 'fr'

// Hauteur (centre de la poignée, coordonnées du flux) de chaque port d'un appareil générique :
// une colonne de poignées sur le bord droit du bloc.
export function rackDevicePortY(index: number, count: number, height: number): number {
  return portOffset(index, count, height)
}

// Le coude d'un câble est une mise en page du schéma : la vue de baie trace ses cordons sans lui.
function rackCordData(data: CordEdgeData, exits: [number, number]): CordEdgeData {
  if (!data.link.elbow) return { ...data, exits }
  const { elbow: _elbow, ...link } = data.link
  return { ...data, link, exits }
}

function freeSpans(project: Project, rack: Rack): FreeSpan[] {
  const used = new Array<boolean>(rack.heightU + 1).fill(false)
  for (const d of project.devices) {
    const at = d.rack
    if (at?.rackId !== rack.id) continue
    for (let u = at.u; u < at.u + at.heightU && u <= rack.heightU; u++) used[u] = true
  }
  const out: FreeSpan[] = []
  let u = rack.heightU
  while (u >= 1) {
    if (used[u]) {
      u--
      continue
    }
    const top = u
    while (u >= 1 && !used[u]) u--
    const n = top - u
    out.push({ y: slotTop(rack, u + 1, n), h: n * RACK_U_PX, n })
  }
  return out
}

function build(project: Project, theme: ThemeMode, m: Messages, cables: boolean): RackFlow {
  const lang = langOf(m)
  const { racks: boxes, slots } = layoutRacks(project)
  const slotOf = new Map<string, SlotBox>(slots.map((s) => [s.deviceId, s]))
  const boxOf = new Map<string, RackBox>(boxes.map((b) => [b.id, b]))
  const analysis = analyzeLinks(project, theme, lang)
  const cache = createFlowCache()
  const nodes: RackFlowNode[] = []

  for (const rack of project.racks ?? []) {
    const box = boxOf.get(rack.id)!
    const zoneName = rack.zoneId ? project.zones.find((z) => z.id === rack.zoneId)?.name : undefined
    nodes.push({
      id: rack.id,
      type: 'rack',
      position: { x: box.x, y: box.y },
      width: box.w,
      height: box.h,
      zIndex: -1,
      // Sous les appareils, le corps laisse passer les clics (vers le panneau) ; seul le titre sélectionne la baie.
      selectable: false,
      draggable: false,
      connectable: false,
      deletable: false,
      focusable: false,
      style: { pointerEvents: 'none' },
      data: { rack, ...(zoneName ? { zoneName } : {}), free: freeSpans(project, rack) }
    })
  }

  // Centre des poignées, pour poser les bouts de câble à la hauteur de leur port.
  const portY = new Map<string, number>()
  for (const node of toFlowNodes(project, analysis, cache, lang)) {
    const slot = slotOf.get(node.id)
    if (!slot) continue
    const { device } = node.data
    if (node.type === 'switch') {
      const facade = switchFacade(device.ports, { patchPanel: isPatchPanel(device) })
      const y = slot.y + Math.max(0, (slot.h - facade.height) / 2)
      nodes.push({ ...node, position: { x: slot.x, y }, draggable: false })
      for (const p of facade.ports) portY.set(portKey({ deviceId: device.id, portId: p.id }), y + p.y + p.h / 2)
      continue
    }
    nodes.push({
      id: device.id,
      type: 'rackDevice',
      position: { x: slot.x, y: slot.y },
      width: slot.w,
      height: slot.h,
      draggable: false,
      data: { device, template: node.data.template, ports: node.data.ports, vlans: node.data.vlans, heightU: device.rack!.heightU }
    })
    device.ports.forEach((p, i) => portY.set(portKey({ deviceId: device.id, portId: p.id }), slot.y + rackDevicePortY(i, device.ports.length, slot.h)))
  }

  if (!cables) return { nodes, edges: [] }

  const edges: CordFlowEdge[] = []
  const stubs: Array<{ link: Link; inside: PortRef; outside: PortRef; rackId: string; y: number; color: string }> = []
  const linkOf = new Map(project.links.map((l) => [l.id, l]))
  for (const edge of toFlowEdges(project, analysis, cache, m)) {
    const link = linkOf.get(edge.id)
    if (!link || !edge.data) continue
    const aIn = slotOf.has(link.a.deviceId)
    const bIn = slotOf.has(link.b.deviceId)
    if (aIn && bIn) {
      edges.push({ ...edge, zIndex: CORD_Z, data: rackCordData(edge.data, edge.data.exits) })
      continue
    }
    if (!aIn && !bIn) continue // aucun bout en baie : pas dans cette vue
    const inside = aIn ? link.a : link.b
    const stubId = `stub-${link.id}`
    const exits: [number, number] = aIn ? [edge.data.exits[0], 0] : [0, edge.data.exits[1]]
    edges.push({
      ...edge,
      zIndex: CORD_Z,
      ...(aIn ? { target: stubId, targetHandle: STUB_HANDLE } : { source: stubId, sourceHandle: STUB_HANDLE }),
      data: rackCordData(edge.data, exits)
    })
    stubs.push({
      link,
      inside,
      outside: aIn ? link.b : link.a,
      rackId: slotOf.get(inside.deviceId)!.rackId,
      y: portY.get(portKey(inside)) ?? slotOf.get(inside.deviceId)!.y,
      color: edge.data.style.color
    })
  }

  // Bouts de câble : au bord droit de leur baie, à la hauteur du port, sans se chevaucher.
  const lastBottom = new Map<string, number>()
  for (const s of [...stubs].sort((a, b) => a.y - b.y)) {
    const box = boxOf.get(s.rackId)!
    const top = Math.max(s.y - RACK_STUB_H / 2, lastBottom.get(s.rackId) ?? -Infinity)
    lastBottom.set(s.rackId, top + RACK_STUB_H + 2)
    const far = findPort(project, s.outside)
    const label = far ? m.racks.stub({ device: far.device.name, port: portDisplayLabel(far.device, far.port, m) }) : m.racks.stub({ device: '?', port: s.outside.portId })
    nodes.push({
      id: `stub-${s.link.id}`,
      type: 'stub',
      position: { x: box.x + box.w + RACK_STUB_GAP, y: top },
      height: RACK_STUB_H,
      selectable: false,
      draggable: false,
      connectable: false,
      deletable: false,
      focusable: false,
      data: { linkId: s.link.id, cableId: s.link.cableId, rackId: s.rackId, label, color: s.color }
    })
  }
  return { nodes, edges }
}

// Mémoire par projet (objets immuables du store), thème, langue et variante : la vue et le PDF
// reçoivent les mêmes objets tant que rien ne change.
const memo = new WeakMap<Project, Map<string, RackFlow>>()

// Nœuds et cordons de la vue de baie, dérivés du projet sans le modifier. Les appareils gardent leur
// identifiant (même sélection que le schéma) ; un câble vers un appareil hors baie finit sur un bout
// de câble étiqueté, jamais sur la position de l'appareil dans le schéma.
export function toRackFlow(project: Project, theme: ThemeMode, m: Messages, opts: { cables?: boolean } = {}): RackFlow {
  const cables = opts.cables ?? true
  const key = `${theme}|${langOf(m)}|${cables ? 1 : 0}`
  let byKey = memo.get(project)
  if (!byKey) {
    byKey = new Map()
    memo.set(project, byKey)
  }
  const hit = byKey.get(key)
  if (hit) return hit
  const out = build(project, theme, m, cables)
  byKey.set(key, out)
  return out
}
