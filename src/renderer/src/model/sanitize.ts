import type { Device, Link, Project, Rack } from './types'
import type { Messages } from '../../../shared/i18n/messages'
import { canConnectPorts, findPort } from './rules'

export function sanitizeProject(project: Project, m: Messages): { project: Project; warnings: string[] } {
  const warnings: string[] = []
  const deviceIds = new Set<string>()
  const devices: Device[] = []
  for (const d of project.devices) {
    if (deviceIds.has(d.id)) {
      warnings.push(m.model.sanitize.duplicateDevice({ name: d.name }))
      continue
    }
    deviceIds.add(d.id)
    devices.push(d)
  }
  // Baies : ids en double retirés ; placements invalides (baie absente, hors baie, chevauchement) retirés dans l'ordre
  const racks: Rack[] = []
  const rackIds = new Set<string>()
  for (const r of project.racks ?? []) {
    if (rackIds.has(r.id)) {
      warnings.push(m.model.sanitize.duplicateRack({ name: r.name }))
      continue
    }
    rackIds.add(r.id)
    racks.push(r)
  }
  const taken = new Map<string, Set<number>>()
  for (let i = 0; i < devices.length; i++) {
    const d = devices[i]!
    const pl = d.rack
    if (!pl) continue
    const rack = racks.find((r) => r.id === pl.rackId)
    const used = taken.get(pl.rackId) ?? new Set<number>()
    let ok = !!rack && pl.u + pl.heightU - 1 <= rack.heightU
    for (let u = pl.u; ok && u < pl.u + pl.heightU; u++) if (used.has(u)) ok = false
    if (ok) {
      for (let u = pl.u; u < pl.u + pl.heightU; u++) used.add(u)
      taken.set(pl.rackId, used)
    } else {
      const { rack: _rack, ...rest } = d
      devices[i] = rest
      warnings.push(m.model.sanitize.rackPlacementDropped({ name: d.name }))
    }
  }
  const links: Link[] = []
  const linkIds = new Set<string>()
  for (const l of project.links) {
    const label = l.cableId || l.id
    if (linkIds.has(l.id)) {
      warnings.push(m.model.sanitize.duplicateCable({ label }))
      continue
    }
    const current: Project = { ...project, devices, links }
    if (!findPort(current, l.a) || !findPort(current, l.b)) {
      warnings.push(m.model.sanitize.cableMissingEnd({ label }))
      continue
    }
    if (!canConnectPorts(current, l.a, l.b)) {
      warnings.push(m.model.sanitize.cableBlocked({ label }))
      continue
    }
    linkIds.add(l.id)
    links.push(l)
  }
  return { project: warnings.length > 0 ? { ...project, devices, links, ...(project.racks ? { racks } : {}) } : project, warnings }
}
