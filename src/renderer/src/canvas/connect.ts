// src/renderer/src/canvas/connect.ts
import type { Link, PortRef, Project } from '../model/types'
import { FAMILY_LABELS, canConnectPorts, canReconnect, sameRef, connectorFamily, findDevice, findPort, pickPort } from '../model/rules'

interface ConnectionLike {
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
}

export function connectionRefs(c: ConnectionLike): [PortRef, PortRef] | null {
  if (!c.sourceHandle || !c.targetHandle) return null
  return [
    { deviceId: c.source, portId: c.sourceHandle },
    { deviceId: c.target, portId: c.targetHandle }
  ]
}

export function makeIsValidConnection(
  getProject: () => Project,
  getReconnecting: () => string | null = () => null,
  isBlocked: () => boolean = () => false
): (c: ConnectionLike) => boolean {
  return (c) => {
    // Pointeur au-dessus de la vignette épinglée : rien ne s'y branche, même si un port du canvas
    // principal se trouve dessous (spec 2026-10-14 § 3.3).
    if (isBlocked()) return false
    const project = getProject()
    const linkId = getReconnecting()
    if (linkId) {
      const link = project.links.find((l) => l.id === linkId)
      const move = link ? reconnectEnd(link, c) : null
      return move ? canReconnect(project, linkId, move.end, move.to) : false
    }
    const refs = connectionRefs(c)
    return refs ? canConnectPorts(project, refs[0], refs[1]) : false
  }
}

// Quel bout d'un câble a été déplacé, et vers quel port. React Flow peut présenter la
// nouvelle connexion dans un sens ou dans l'autre : on teste les quatre cas.
export function reconnectEnd(link: Pick<Link, 'a' | 'b'>, c: ConnectionLike): { end: 'a' | 'b'; to: PortRef } | null {
  if (!c.sourceHandle || !c.targetHandle) return null
  const src = { deviceId: c.source, portId: c.sourceHandle }
  const tgt = { deviceId: c.target, portId: c.targetHandle }
  if (sameRef(src, link.a)) return sameRef(tgt, link.b) ? null : { end: 'b', to: tgt }
  if (sameRef(tgt, link.b)) return { end: 'a', to: src }
  if (sameRef(src, link.b)) return sameRef(tgt, link.a) ? null : { end: 'a', to: tgt }
  if (sameRef(tgt, link.a)) return { end: 'b', to: src }
  return null
}

export function clientPoint(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
  if ('changedTouches' in event) {
    const touch = event.changedTouches[0]
    return touch ? { x: touch.clientX, y: touch.clientY } : null
  }
  return { x: event.clientX, y: event.clientY }
}

export function nodeIdAt(doc: Pick<Document, 'elementFromPoint'>, point: { x: number; y: number }): string | null {
  const el = doc.elementFromPoint(point.x, point.y)
  // Un lâcher au-dessus de la vignette épinglée n'atteint aucun appareil.
  if (el?.closest('.pinned')) return null
  return el?.closest('.react-flow__node')?.getAttribute('data-id') ?? null
}

// Même chose pour un rebranchement : le câble déplacé est mis de côté, `fixed` est le bout qui reste.
export function dropReconnectOnDevice(
  project: Project,
  linkId: string,
  fixed: PortRef,
  targetId: string
): { ok: true; end: 'a' | 'b'; to: PortRef } | { ok: false; message: string } {
  const link = project.links.find((l) => l.id === linkId)
  if (!link) return { ok: false, message: '' }
  const end = sameRef(link.a, fixed) ? 'b' : 'a'
  const res = dropOnDevice({ ...project, links: project.links.filter((l) => l.id !== linkId) }, fixed, targetId)
  return res.ok ? { ok: true, end, to: res.to } : res
}

export function dropOnDevice(
  project: Project,
  from: PortRef,
  targetId: string
): { ok: true; to: PortRef } | { ok: false; message: string } {
  const target = findDevice(project, targetId)
  const source = findPort(project, from)
  if (!target || !source || targetId === from.deviceId) return { ok: false, message: '' }
  const portId = pickPort(project, from, targetId)
  if (!portId) return { ok: false, message: `Aucun port ${FAMILY_LABELS[connectorFamily(source.port.connector)]} libre sur ${target.name}.` }
  return { ok: true, to: { deviceId: targetId, portId } }
}
