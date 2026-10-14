import type { Device, Link, Medium, PortRef, Project } from '../model/types'
import { createDevice, createProject } from '../model/project'

// 12 switchs 48 ports + 138 appareils (396 câbles cuivre) + 4 liens SFP+ = 150 appareils, 400 câbles.
export function makeStressProject(): Project {
  let p = createProject(new Date('2026-10-13T12:00:00Z'))
  const add = (templateId: string, x: number, y: number, switchSpec?: Device['switch']): Device => {
    const device = createDevice(p, templateId, { x, y }, { id: `d${p.devices.length + 1}`, ...(switchSpec ? { switchSpec } : {}) })
    p = { ...p, devices: [...p.devices, device] }
    return device
  }
  const switches: Device[] = []
  for (let i = 0; i < 12; i++) {
    switches.push(add('switch', (i % 4) * 760, Math.floor(i / 4) * 900, { portCount: 48, poe: 'at', poeBudgetW: 600, sfpPlus: 4, managed: true }))
  }
  const ends: Device[] = []
  let k = 0
  for (const [templateId, count] of [
    ['media-server', 60],
    ['server', 40],
    ['nas', 38]
  ] as const) {
    for (let i = 0; i < count; i++, k++) ends.push(add(templateId, (k % 23) * 200, 2800 + Math.floor(k / 23) * 120))
  }
  const free: PortRef[] = []
  for (let port = 1; port <= 48; port++) for (const sw of switches) free.push({ deviceId: sw.id, portId: String(port) })
  const links: Link[] = []
  const link = (a: PortRef, b: PortRef, medium: Medium): void => {
    const n = links.length + 1
    links.push({ id: `l${n}`, cableId: `C-${String(n).padStart(3, '0')}`, a, b, medium })
  }
  let next = 0
  for (const d of ends) {
    for (const port of d.ports) {
      if (port.connector !== 'rj45') continue
      const target = free[next++]
      if (!target) throw new Error('Plus de ports libres dans le projet de stress')
      link({ deviceId: d.id, portId: port.id }, target, 'cat6')
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = switches[i]
    const b = switches[i + 4]
    if (a && b) link({ deviceId: a.id, portId: 'SFP+1' }, { deviceId: b.id, portId: 'SFP+2' }, 'om4')
  }
  return { ...p, links }
}
