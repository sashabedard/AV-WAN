import type { Messages } from '../../../shared/i18n/messages'
import type { Device, Project, Rack } from './types'
import { newId } from './project'

export const RACK_HEIGHTS = [6, 12, 24, 42] as const
export const DEFAULT_RACK_HEIGHT = 12
export const RACK_HEIGHT_MAX = 52

const rackOf = (p: Project, id: string): Rack | undefined => (p.racks ?? []).find((r) => r.id === id)

// Plus petit numéro libre : BAIE-1, BAIE-2…
function freeName(project: Project, m: Messages): string {
  const names = new Set((project.racks ?? []).map((r) => r.name))
  let n = 1
  while (names.has(m.model.rack.defaultName({ n }))) n++
  return m.model.rack.defaultName({ n })
}

export function addRack(
  project: Project,
  m: Messages,
  opts: { name?: string; heightU?: number; zoneId?: string } = {},
  makeId: () => string = newId
): { project: Project; id: string } {
  const id = makeId()
  const rack: Rack = {
    id,
    name: opts.name ?? freeName(project, m),
    heightU: opts.heightU ?? DEFAULT_RACK_HEIGHT,
    ...(opts.zoneId ? { zoneId: opts.zoneId } : {})
  }
  return { project: { ...project, racks: [...(project.racks ?? []), rack] }, id }
}

// null : la nouvelle hauteur ne contient plus un appareil placé
export function updateRack(project: Project, id: string, patch: { name?: string; heightU?: number; zoneId?: string | null }): Project | null {
  const rack = rackOf(project, id)
  if (!rack) return project
  const next: Rack = { ...rack }
  if (patch.name !== undefined) next.name = patch.name
  if (patch.heightU !== undefined) next.heightU = patch.heightU
  if (patch.zoneId === null) delete next.zoneId
  else if (patch.zoneId !== undefined) next.zoneId = patch.zoneId
  if (rackDevices(project, id).some((d) => d.rack!.u + d.rack!.heightU - 1 > next.heightU)) return null
  return { ...project, racks: (project.racks ?? []).map((r) => (r.id === id ? next : r)) }
}

// Les appareils de la baie perdent leur placement ; câbles et positions du schéma restent.
export function removeRack(project: Project, id: string): Project {
  return {
    ...project,
    racks: (project.racks ?? []).filter((r) => r.id !== id),
    devices: project.devices.map((d) => {
      if (d.rack?.rackId !== id) return d
      const { rack: _rack, ...rest } = d
      return rest
    })
  }
}

export function fitsAt(project: Project, rackId: string, u: number, heightU: number, ignoreDeviceId?: string): boolean {
  const rack = rackOf(project, rackId)
  if (!rack || !Number.isInteger(u) || !Number.isInteger(heightU) || u < 1 || heightU < 1) return false
  if (u + heightU - 1 > rack.heightU) return false
  return !rackDevices(project, rackId).some((d) => d.id !== ignoreDeviceId && u <= d.rack!.u + d.rack!.heightU - 1 && d.rack!.u <= u + heightU - 1)
}

// Le U le plus bas où l'appareil tient
export function firstFreeU(project: Project, rackId: string, heightU: number, ignoreDeviceId?: string): number | undefined {
  const rack = rackOf(project, rackId)
  if (!rack) return undefined
  for (let u = 1; u + heightU - 1 <= rack.heightU; u++) if (fitsAt(project, rackId, u, heightU, ignoreDeviceId)) return u
  return undefined
}

function withRack(project: Project, deviceId: string, rack: Device['rack']): Project {
  return {
    ...project,
    devices: project.devices.map((d) => {
      if (d.id !== deviceId) return d
      const { rack: _old, ...rest } = d
      return rack ? { ...rest, rack } : rest
    })
  }
}

export function placeDevice(project: Project, deviceId: string, rackId: string, u: number, heightU?: number): Project | null {
  const d = project.devices.find((x) => x.id === deviceId)
  if (!d) return null
  const h = heightU ?? d.rack?.heightU ?? 1
  if (!fitsAt(project, rackId, u, h, deviceId)) return null
  return withRack(project, deviceId, { rackId, u, heightU: h })
}

export function unplaceDevice(project: Project, deviceId: string): Project {
  return withRack(project, deviceId, undefined)
}

export function setDeviceHeightU(project: Project, deviceId: string, heightU: number): Project | null {
  const pl = project.devices.find((x) => x.id === deviceId)?.rack
  if (!pl) return null
  return placeDevice(project, deviceId, pl.rackId, pl.u, heightU)
}

export function rackDevices(project: Project, rackId: string): Device[] {
  return project.devices.filter((d) => d.rack?.rackId === rackId).sort((a, b) => a.rack!.u - b.rack!.u)
}
