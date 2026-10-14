import type { Edge, Node } from '@xyflow/react'
import type { Device, DeviceTemplate, Link, PortRef, Project, Side, Zone } from '../model/types'
import { getTemplate } from '../catalog'
import { resolvePortSide } from '../model/layout'
import { findPort, sameRef } from '../model/rules'
import { POE_LABELS, linkPoe, linkVlanIds } from '../model/derive'
import { NEUTRAL, cordStyle, type CordStyle, type ThemeMode } from './cordStyle'
import { nodeSize } from './nodeGeometry'

export interface PortInfo {
  linkId: string
  color: string
  poe: boolean // ce port fournit l'alimentation PoE
}
export interface PoeUsage {
  usedW: number
  budgetW?: number
}
export type DeviceNodeData = {
  device: Device
  template: DeviceTemplate | undefined
  side: Side
  ports: Record<string, PortInfo>
  poeUsage?: PoeUsage
  vlans: number[]
}
export type DeviceFlowNode = Node<DeviceNodeData, 'device' | 'switch'>
export type ZoneNodeData = { zone: Zone }
export type ZoneFlowNode = Node<ZoneNodeData, 'zone'>
export type FlowNode = DeviceFlowNode | ZoneFlowNode
export type CordEdgeData = { link: Link; style: CordStyle; tag: string; portLabels: [string, string]; vlans: number[]; poeAt: 'source' | 'target' | null }
export type CordFlowEdge = Edge<CordEdgeData, 'cord'>

export interface FlowCache {
  nodes: Map<string, { key: string; device: Device; node: DeviceFlowNode }>
  edges: Map<string, { key: string; link: Link; edge: CordFlowEdge }>
  zones: Map<string, { zone: Zone; node: ZoneFlowNode }>
}
export interface LinkAnalysis {
  ports: Map<string, Record<string, PortInfo>>
  poeUsed: Map<string, number>
  styles: Map<string, CordStyle>
  linkVlans: Map<string, number[]>
  poeAt: Map<string, 'source' | 'target'>
  deviceVlans: Map<string, number[]>
}

export function createFlowCache(): FlowCache {
  return { nodes: new Map(), edges: new Map(), zones: new Map() }
}

export function analyzeLinks(project: Project, theme: ThemeMode): LinkAnalysis {
  const ports = new Map<string, Record<string, PortInfo>>()
  const poeUsed = new Map<string, number>()
  const styles = new Map<string, CordStyle>()
  const linkVlans = new Map<string, number[]>()
  const poeAt = new Map<string, 'source' | 'target'>()
  const deviceSets = new Map<string, Set<number>>()
  for (const link of project.links) {
    const style = cordStyle(project, link, theme)
    styles.set(link.id, style)
    const vlans = linkVlanIds(project, link)
    linkVlans.set(link.id, vlans)
    for (const end of [link.a, link.b]) {
      const set = deviceSets.get(end.deviceId) ?? new Set<number>()
      for (const v of vlans) set.add(v)
      deviceSets.set(end.deviceId, set)
    }
    const poe = linkPoe(project, link)
    if (poe.active && poe.pse) poeAt.set(link.id, sameRef(poe.pse, link.a) ? 'source' : 'target')
    if (poe.active && poe.pse) poeUsed.set(poe.pse.deviceId, (poeUsed.get(poe.pse.deviceId) ?? 0) + (poe.drawW ?? 0))
    for (const end of [link.a, link.b]) {
      const record = ports.get(end.deviceId) ?? {}
      const prev = record[end.portId] // radio de point d'accès : plusieurs liens sur la même prise
      record[end.portId] = {
        linkId: prev?.linkId ?? link.id,
        color: prev && prev.color !== style.color ? NEUTRAL[theme] : style.color,
        poe: poe.active && poe.pse?.deviceId === end.deviceId && poe.pse.portId === end.portId
      }
      ports.set(end.deviceId, record)
    }
  }
  return {
    ports,
    poeUsed,
    styles,
    linkVlans,
    poeAt,
    deviceVlans: new Map([...deviceSets].map(([id, s]) => [id, [...s].sort((a, b) => a - b)]))
  }
}

const NO_PORTS: Record<string, PortInfo> = {}
const NO_VLANS: number[] = []

export function toFlowNodes(project: Project, analysis: LinkAnalysis, cache: FlowCache): DeviceFlowNode[] {
  const out: DeviceFlowNode[] = []
  const alive = new Set<string>()
  for (const device of project.devices) {
    alive.add(device.id)
    const side = resolvePortSide(project, device, nodeSize)
    const ports = analysis.ports.get(device.id) ?? NO_PORTS
    const vlans = analysis.deviceVlans.get(device.id) ?? NO_VLANS
    const poeUsage: PoeUsage | undefined = device.switch
      ? {
          usedW: Math.round((analysis.poeUsed.get(device.id) ?? 0) * 10) / 10,
          ...(device.switch.poeBudgetW !== undefined ? { budgetW: device.switch.poeBudgetW } : {})
        }
      : undefined
    const key = `${side}|${JSON.stringify(ports)}|${JSON.stringify(poeUsage ?? null)}|${vlans.join(',')}`
    const hit = cache.nodes.get(device.id)
    if (hit && hit.device === device && hit.key === key) {
      out.push(hit.node)
      continue
    }
    const node: DeviceFlowNode = {
      id: device.id,
      type: device.switch ? 'switch' : 'device',
      position: device.position,
      data: { device, template: getTemplate(project, device.templateId), side, ports, vlans, ...(poeUsage ? { poeUsage } : {}) }
    }
    cache.nodes.set(device.id, { key, device, node })
    out.push(node)
  }
  for (const id of [...cache.nodes.keys()]) if (!alive.has(id)) cache.nodes.delete(id)
  return out
}

export function cordTag(project: Project, link: Link): string {
  const end = (r: PortRef): string => {
    const f = findPort(project, r)
    return f ? `${f.device.name}:${f.port.label}` : '?'
  }
  const poe = linkPoe(project, link)
  return `${link.cableId} · ${end(link.a)} ⇄ ${end(link.b)}${poe.active && poe.cls ? ` · ${POE_LABELS[poe.cls]}` : ''}`
}

export function toFlowEdges(project: Project, analysis: LinkAnalysis, cache: FlowCache): CordFlowEdge[] {
  const out: CordFlowEdge[] = []
  const alive = new Set<string>()
  for (const link of project.links) {
    const style = analysis.styles.get(link.id)
    if (!style) continue
    alive.add(link.id)
    const tag = cordTag(project, link)
    const label = (r: PortRef): string => findPort(project, r)?.port.label ?? r.portId
    const portLabels: [string, string] = [label(link.a), label(link.b)]
    const vlans = analysis.linkVlans.get(link.id) ?? NO_VLANS
    const poeAt = analysis.poeAt.get(link.id) ?? null
    const key = `${JSON.stringify(style)}|${tag}|${portLabels.join('|')}|${vlans.join(',')}|${poeAt}`
    const hit = cache.edges.get(link.id)
    if (hit && hit.link === link && hit.key === key) {
      out.push(hit.edge)
      continue
    }
    const edge: CordFlowEdge = {
      id: link.id,
      type: 'cord',
      source: link.a.deviceId,
      sourceHandle: link.a.portId,
      target: link.b.deviceId,
      targetHandle: link.b.portId,
      data: { link, style, tag, portLabels, vlans, poeAt }
    }
    cache.edges.set(link.id, { key, link, edge })
    out.push(edge)
  }
  for (const id of [...cache.edges.keys()]) if (!alive.has(id)) cache.edges.delete(id)
  return out
}

// Les zones passent sous les cordons et les appareils ; seul leur titre sert à les déplacer.
export function toFlowZones(project: Project, cache: FlowCache): ZoneFlowNode[] {
  const alive = new Set<string>()
  const out = project.zones.map((zone) => {
    alive.add(zone.id)
    const hit = cache.zones.get(zone.id)
    if (hit && hit.zone === zone) return hit.node
    const node: ZoneFlowNode = {
      id: zone.id,
      type: 'zone',
      position: { x: zone.rect.x, y: zone.rect.y },
      width: zone.rect.w,
      height: zone.rect.h,
      zIndex: -1,
      dragHandle: '.zone__title',
      data: { zone }
    }
    cache.zones.set(zone.id, { zone, node })
    return node
  })
  for (const id of [...cache.zones.keys()]) if (!alive.has(id)) cache.zones.delete(id)
  return out
}
