import type { Device, Link, PortDef, Project } from '../../model/types'
import { createDevice, createProject } from '../../model/project'

const dc = (id: string): PortDef => ({ id, label: id.replace(/-/g, ' '), connector: 'dc' })
const link = (id: string, a: [string, string], b: [string, string], medium: Link['medium'] = 'dc'): Link => ({ id, cableId: id, a: { deviceId: a[0], portId: a[1] }, b: { deviceId: b[0], portId: b[1] }, medium })

// Scène : PSU-1 (24 V 15 A) → LED-1, LED-2 (144 W chacune) ; MH-1 470 W. Salle : SW-1 sans puissance, CAM-1 7 W en PoE.
export function powerShowProject(): Project {
  const base = createProject(new Date(2026, 9, 14), 'fr')
  let p: Project = {
    ...base,
    zones: [
      { id: 'z1', name: 'Scène', color: '#3DBE6E', rect: { x: 0, y: 0, w: 10, h: 10 }, ownPdfPage: false },
      { id: 'z2', name: 'Salle', color: '#3E8EF7', rect: { x: 20, y: 0, w: 10, h: 10 }, ownPdfPage: false }
    ]
  }
  const raw = (id: string, name: string, zoneId: string, extra: Partial<Device>): Device => ({ id, templateId: 'generic', name, position: { x: 0, y: 0 }, zoneId, portSide: 'auto', ports: [], portState: {}, ...extra })
  const strip = { type: 'cob' as const, volts: 24, wPerM: 14.4, lengthM: 10 }
  const sw = { ...createDevice(p, 'switch', { x: 0, y: 0 }, { lang: 'fr', id: 'sw' }), name: 'SW-1', zoneId: 'z2' }
  const cam = { ...createDevice(p, 'ip-camera', { x: 0, y: 0 }, { lang: 'fr', id: 'cam' }), name: 'CAM-1', zoneId: 'z2', powerW: 7 }
  p = {
    ...p,
    devices: [
      raw('psu', 'PSU-1', 'z1', { ports: [dc('DC-OUT-1'), dc('DC-OUT-2')], psu: { volts: 24, amps: 15 } }),
      raw('led1', 'LED-1', 'z1', { templateId: 'led-strip', ports: [dc('DC-IN')], ledStrip: strip }),
      raw('led2', 'LED-2', 'z1', { templateId: 'led-strip', ports: [dc('DC-IN')], ledStrip: strip }),
      raw('mh', 'MH-1', 'z1', { model: 'Lyre spot', powerW: 470 }),
      sw,
      cam
    ],
    links: [link('l1', ['psu', 'DC-OUT-1'], ['led1', 'DC-IN']), link('l2', ['psu', 'DC-OUT-2'], ['led2', 'DC-IN']), link('e1', ['sw', '1'], ['cam', 'ETH'], 'cat6')]
  }
  return p
}
