import type { Device, Project } from '../../model/types'
import { createDevice, createProject } from '../../model/project'

// Petit show DMX partagé par les tests du patch : un nœud, deux lyres chaînées, un chevauchement, un univers tapé et un appareil sans univers.
export function patchShowProject(): Project {
  let p: Project = createProject(new Date(2026, 9, 14))
  const add = (id: string, templateId: string, extra: Partial<Device>): void => {
    p = { ...p, devices: [...p.devices, { ...createDevice(p, templateId, { x: 0, y: 0 }, { id }), ...extra }] }
  }
  add('ode', 'dmx-node', { name: 'ODE-1', portState: { 'DMX-1': { universe: 1 } } })
  add('mh2', 'dmx-fixture', { name: 'MH-2', model: 'Lyre spot', dmx: { footprint: 16, address: 17, mode: 'Standard 16 ch' } })
  add('mh1', 'dmx-fixture', { name: 'MH-1', model: 'Lyre spot', dmx: { footprint: 16, address: 1, mode: 'Standard 16 ch' } })
  add('par', 'dmx-fixture', { name: 'PAR-1', dmx: { footprint: 8, address: 10, universe: 1 } })
  add('u2', 'dmx-fixture', { name: 'WASH-1', dmx: { footprint: 14, address: 1, universe: 2 } })
  add('none', 'dmx-fixture', { name: 'HAZE-1', dmx: { footprint: 2 } })
  p = {
    ...p,
    links: [
      { id: 'l1', cableId: 'C-001', a: { deviceId: 'ode', portId: 'DMX-1' }, b: { deviceId: 'mh1', portId: 'DMX-IN' }, medium: 'dmx' },
      { id: 'l2', cableId: 'C-002', a: { deviceId: 'mh1', portId: 'DMX-OUT' }, b: { deviceId: 'mh2', portId: 'DMX-IN' }, medium: 'dmx' }
    ]
  }
  return p
}
