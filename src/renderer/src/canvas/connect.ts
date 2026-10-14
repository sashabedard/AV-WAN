// src/renderer/src/canvas/connect.ts
import type { PortRef, Project } from '../model/types'
import { FAMILY_LABELS, canConnectPorts, connectorFamily, findDevice, findPort, pickPort } from '../model/rules'

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

export function makeIsValidConnection(getProject: () => Project): (c: ConnectionLike) => boolean {
  return (c) => {
    const refs = connectionRefs(c)
    return refs ? canConnectPorts(getProject(), refs[0], refs[1]) : false
  }
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
  return el?.closest('.react-flow__node')?.getAttribute('data-id') ?? null
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
