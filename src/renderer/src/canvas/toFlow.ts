import type { Edge, Node } from '@xyflow/react'
import type { Device, DeviceTemplate, Link, PortRef, Project, Side } from '../model/types'
import { getTemplate } from '../catalog'
import { resolvePortSide } from '../model/layout'
import { findPort } from '../model/rules'
import { POE_LABELS, linkPoe } from '../model/derive'
import { cordStyle, type CordStyle, type ThemeMode } from './cordStyle'

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
}
export type DeviceFlowNode = Node<DeviceNodeData, 'device' | 'switch'>
export type CordEdgeData = { link: Link; style: CordStyle; tag: string }
export type CordFlowEdge = Edge<CordEdgeData, 'cord'>

export interface FlowCache {
  nodes: Map<string, { key: string; device: Device; node: DeviceFlowNode }>
  edges: Map<string, { key: string; link: Link; edge: CordFlowEdge }>
}
export interface LinkAnalysis {
  ports: Map<string, Record<string, PortInfo>>
  poeUsed: Map<string, number>
  styles: Map<string, CordStyle>
}

export function createFlowCache(): FlowCache {
  return { nodes: new Map(), edges: new Map() }
}

export function analyzeLinks(project: Project, theme: ThemeMode): LinkAnalysis {
  const ports = new Map<string, Record<string, PortInfo>>()
  const poeUsed = new Map<string, number>()
  const styles = new Map<string, CordStyle>()
  for (const link of project.links) {
    const style = cordStyle(project, link, theme)
    styles.set(link.id, style)
    const poe = linkPoe(project, link)
    if (poe.active && poe.pse) poeUsed.set(poe.pse.deviceId, (poeUsed.get(poe.pse.deviceId) ?? 0) + (poe.drawW ?? 0))
    for (const end of [link.a, link.b]) {
      const record = ports.get(end.deviceId) ?? {}
      record[end.portId] = {
        linkId: link.id,
        color: style.color,
        poe: poe.active && poe.pse?.deviceId === end.deviceId && poe.pse.portId === end.portId
      }
      ports.set(end.deviceId, record)
    }
  }
  return { ports, poeUsed, styles }
}

const NO_PORTS: Record<string, PortInfo> = {}

export function toFlowNodes(project: Project, analysis: LinkAnalysis, cache: FlowCache): DeviceFlowNode[] {
  const out: DeviceFlowNode[] = []
  const alive = new Set<string>()
  for (const device of project.devices) {
    alive.add(device.id)
    const side = resolvePortSide(project, device)
    const ports = analysis.ports.get(device.id) ?? NO_PORTS
    const poeUsage: PoeUsage | undefined = device.switch
      ? {
          usedW: Math.round((analysis.poeUsed.get(device.id) ?? 0) * 10) / 10,
          ...(device.switch.poeBudgetW !== undefined ? { budgetW: device.switch.poeBudgetW } : {})
        }
      : undefined
    const key = `${side}|${JSON.stringify(ports)}|${JSON.stringify(poeUsage ?? null)}`
    const hit = cache.nodes.get(device.id)
    if (hit && hit.device === device && hit.key === key) {
      out.push(hit.node)
      continue
    }
    const node: DeviceFlowNode = {
      id: device.id,
      type: device.switch ? 'switch' : 'device',
      position: device.position,
      data: { device, template: getTemplate(project, device.templateId), side, ports, ...(poeUsage ? { poeUsage } : {}) }
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
    const key = `${JSON.stringify(style)}|${tag}`
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
      data: { link, style, tag }
    }
    cache.edges.set(link.id, { key, link, edge })
    out.push(edge)
  }
  for (const id of [...cache.edges.keys()]) if (!alive.has(id)) cache.edges.delete(id)
  return out
}
