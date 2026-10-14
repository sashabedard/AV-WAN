// src/renderer/src/model/clipboard.ts
import { z } from 'zod'
import type { Device, Link, Project } from './types'
import { DeviceSchema, LinkSchema } from './schema'
import { canConnectPorts, nextCableId } from './rules'
import { newId } from './project'

export const FRAGMENT_MIME = 'application/x-avwan-fragment'

export interface Fragment {
  devices: Device[]
  links: Link[]
}

const FragmentSchema = z.object({ avwanFragment: z.literal(1), devices: z.array(DeviceSchema), links: z.array(LinkSchema) })

export function copyFragment(project: Project, deviceIds: readonly string[]): Fragment | null {
  const ids = new Set(deviceIds)
  const devices = project.devices.filter((d) => ids.has(d.id))
  if (devices.length === 0) return null
  const links = project.links.filter((l) => ids.has(l.a.deviceId) && ids.has(l.b.deviceId))
  return structuredClone({ devices, links })
}

export function serializeFragment(f: Fragment): string {
  return JSON.stringify({ avwanFragment: 1, devices: f.devices, links: f.links })
}

export function parseFragment(text: string): Fragment | null {
  try {
    const r = FragmentSchema.safeParse(JSON.parse(text))
    return r.success ? { devices: r.data.devices, links: r.data.links } : null
  } catch {
    return null
  }
}

// « CAM-1 » → « CAM-2 » (ou le suivant libre) ; « Régie » → « Régie-2 ».
export function nextCopyName(project: Project, name: string): string {
  const used = new Set(project.devices.map((d) => d.name))
  const m = /^(.*)-(\d+)$/.exec(name)
  const base = m ? m[1]! : name
  let k = m ? Number(m[2]) + 1 : 2
  while (used.has(`${base}-${k}`)) k++
  return `${base}-${k}`
}

export function pasteFragment(
  project: Project,
  fragment: Fragment,
  offset: { x: number; y: number },
  makeId: () => string = newId
): { project: Project; deviceIds: string[]; linkIds: string[] } {
  let p = project
  const idMap = new Map<string, string>()
  const deviceIds: string[] = []
  for (const d of fragment.devices) {
    const id = makeId()
    idMap.set(d.id, id)
    const { zoneId: _zone, hostname: _host, ip, ...rest } = structuredClone(d)
    const copy: Device = {
      ...rest,
      id,
      name: nextCopyName(p, d.name),
      position: { x: d.position.x + offset.x, y: d.position.y + offset.y },
      ...(ip ? { ip: { address: '', mode: ip.mode } } : {}) // deux appareils ne partagent pas une IP
    }
    p = { ...p, devices: [...p.devices, copy] }
    deviceIds.push(id)
  }
  const linkIds: string[] = []
  for (const l of fragment.links) {
    const a = idMap.get(l.a.deviceId)
    const b = idMap.get(l.b.deviceId)
    if (!a || !b) continue
    const link: Link = { ...structuredClone(l), id: makeId(), cableId: nextCableId(p), a: { deviceId: a, portId: l.a.portId }, b: { deviceId: b, portId: l.b.portId } }
    if (!canConnectPorts(p, link.a, link.b)) continue
    p = { ...p, links: [...p.links, link] }
    linkIds.push(link.id)
  }
  return { project: p, deviceIds, linkIds }
}
