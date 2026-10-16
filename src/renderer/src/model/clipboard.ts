// src/renderer/src/model/clipboard.ts
import { z } from 'zod'
import type { Device, StoredTemplate, DmxChannelList, Link, Project } from './types'
import { DeviceSchema, DeviceTemplateSchema, DmxChannelListSchema, LinkSchema } from './schema'
import { withTemplate } from './customTemplate'
import { canConnectPorts, nextCableId } from './rules'
import { channelKey, keyId, listKey, mergeProjectLists } from './dmxChannels'
import { newId } from './project'
import { nextFreeAddress, patchIndex, resolveUniverse, type PatchIndex, type PatchRange } from './dmx'

export const FRAGMENT_MIME = 'application/x-avwan-fragment'

export interface Fragment {
  devices: Device[]
  links: Link[]
  // Composantes perso des appareils copiés : le collage les embarque dans le projet cible.
  templates?: StoredTemplate[]
  // Listes de canaux DMX des appareils copiés (le projet cible garde les siennes).
  dmxChannels?: DmxChannelList[]
}

const FragmentSchema = z.object({
  avwanFragment: z.literal(1),
  devices: z.array(DeviceSchema),
  links: z.array(LinkSchema),
  templates: z.array(DeviceTemplateSchema).optional(),
  dmxChannels: z.array(DmxChannelListSchema).optional()
})

export function copyFragment(project: Project, deviceIds: readonly string[]): Fragment | null {
  const ids = new Set(deviceIds)
  const devices = project.devices.filter((d) => ids.has(d.id))
  if (devices.length === 0) return null
  const links = project.links.filter((l) => ids.has(l.a.deviceId) && ids.has(l.b.deviceId))
  const used = new Set(devices.map((d) => d.templateId))
  const templates = project.templates.filter((t) => used.has(t.id))
  // § 4.5 : la copie n'a pas les câbles de l'original ; elle garde son univers effectif, figé ici.
  const index = patchIndex(project)
  const frozen = devices.map((d) => {
    if (!d.dmx || d.dmx.universe !== undefined) return d
    const u = index.entries.get(d.id)?.universe
    // Sa source d'univers est aussi copiée, et le câblage copié y mène encore : la copie reste automatique dans sa propre chaîne (daisy-chain § 4.5).
    if (u?.source.kind === 'port' && ids.has(u.source.ref.deviceId)) {
      const own = resolveUniverse({ ...project, devices, links }, d.id)
      const src = u.source.ref
      if (own?.source.kind === 'port' && own.source.ref.deviceId === src.deviceId && own.source.ref.portId === src.portId) return d
    }
    return u ? { ...d, dmx: { ...d.dmx, universe: u.universe } } : d
  })
  const keys = new Set(devices.flatMap((d) => {
    const k = channelKey(d)
    return k ? [keyId(k)] : []
  }))
  const dmxChannels = (project.dmxChannels ?? []).filter((l) => keys.has(keyId(listKey(l))))
  return structuredClone({ devices: frozen, links, templates, ...(dmxChannels.length > 0 ? { dmxChannels } : {}) })
}

export function serializeFragment(f: Fragment): string {
  return JSON.stringify({ avwanFragment: 1, devices: f.devices, links: f.links, templates: f.templates ?? [], dmxChannels: f.dmxChannels ?? [] })
}

export function parseFragment(text: string): Fragment | null {
  try {
    const r = FragmentSchema.safeParse(JSON.parse(text))
    return r.success ? { devices: r.data.devices, links: r.data.links, templates: r.data.templates ?? [], dmxChannels: r.data.dmxChannels ?? [] } : null
  } catch {
    return null
  }
}

// § 4.5 : une copie patchée prend l'adresse suivante libre de son univers ; sans univers, pas d'adresse.
function withNextAddress(index: PatchIndex, device: Device): Device {
  if (!device.dmx) return device
  const { address: _previous, addressPinned: _pinned, ...dmx } = device.dmx
  if (dmx.universe === undefined) return { ...device, dmx }
  const address = nextFreeAddress(index, dmx.universe, dmx.footprint)
  return { ...device, dmx: address !== undefined ? { ...dmx, address } : dmx }
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
  let p = mergeProjectLists((fragment.templates ?? []).reduce(withTemplate, project), fragment.dmxChannels ?? [])
  // L'index est calculé une fois ; la plage de chaque copie s'ajoute à une liste locale (jamais à l'index en cache)
  // pour que les copies suivantes la voient. Les câbles des copies n'arrivent qu'après : ils ne changent aucun univers ici.
  const base = patchIndex(p)
  const ranges: PatchRange[] = [...base.ranges]
  const index: PatchIndex = { ...base, ranges }
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
    const placed = withNextAddress(index, copy)
    const dmx = placed.dmx
    if (dmx?.universe !== undefined && dmx.address !== undefined) ranges.push({ ownerId: id, universe: dmx.universe, start: dmx.address, end: dmx.address + dmx.footprint - 1 })
    p = { ...p, devices: [...p.devices, placed] }
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
