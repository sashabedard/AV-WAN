import type { Device, Link, Project } from './types'
import { canConnectPorts, findPort } from './rules'

export function sanitizeProject(project: Project): { project: Project; warnings: string[] } {
  const warnings: string[] = []
  const deviceIds = new Set<string>()
  const devices: Device[] = []
  for (const d of project.devices) {
    if (deviceIds.has(d.id)) {
      warnings.push(`Appareil en double ignoré : ${d.name}.`)
      continue
    }
    deviceIds.add(d.id)
    devices.push(d)
  }
  const links: Link[] = []
  const linkIds = new Set<string>()
  for (const l of project.links) {
    const label = l.cableId || l.id
    if (linkIds.has(l.id)) {
      warnings.push(`Câble en double ignoré : ${label}.`)
      continue
    }
    const current: Project = { ...project, devices, links }
    if (!findPort(current, l.a) || !findPort(current, l.b)) {
      warnings.push(`Câble ${label} ignoré : il référence un appareil ou un port absent.`)
      continue
    }
    if (!canConnectPorts(current, l.a, l.b)) {
      warnings.push(`Câble ${label} ignoré : port déjà occupé ou connecteurs incompatibles.`)
      continue
    }
    linkIds.add(l.id)
    links.push(l)
  }
  return { project: warnings.length > 0 ? { ...project, devices, links } : project, warnings }
}
