// src/renderer/src/samples/exampleProject.ts
import type { Device, Link, Project } from '../model/types'
import { createDevice, createProject } from '../model/project'
import { setLinkVlan, type VlanChoice } from '../model/derive'
import { assignZones } from '../model/zones'
import { vlanPreset } from '../catalog/vlanPresets'

export const EXAMPLE_TITLE = 'Installation interactive (exemple)'

type Extra = Partial<Pick<Device, 'model' | 'ip' | 'hostname' | 'note' | 'dmx' | 'powerW' | 'psu' | 'ledStrip' | 'portState'>>
const fixe = (address: string): NonNullable<Device['ip']> => ({ address, mode: 'static' })
const DHCP: NonNullable<Device['ip']> = { address: '', mode: 'dhcp' }
const access = (vlan: number): VlanChoice => ({ kind: 'access', vlan })
const NONE: VlanChoice = { kind: 'none' }
const TRUNK_ALL: VlanChoice = { kind: 'trunk', native: 10, tagged: 'all' }

// Projet exemple de l'écran d'accueil : une régie, une salle et une scène, câblées et réglées.
// Identifiants stables (ex-…) : les captures du README et les tests restent reproductibles.
export function createExampleProject(now: Date = new Date()): Project {
  const base = createProject(now)
  let p: Project = { ...base, meta: { ...base.meta, title: EXAMPLE_TITLE, authors: ['Équipe technique'] }, vlans: [10, 20, 30, 40, 50, 60].map(vlanPreset), settings: { ...base.settings, mainsVoltage: 120 } }
  const ids = new Map<string, string>()
  const id = (key: string): string => {
    const v = ids.get(key)
    if (!v) throw new Error(`Appareil exemple inconnu : ${key}`)
    return v
  }
  const add = (key: string, templateId: string, x: number, y: number, extra: Extra = {}, switchSpec?: Device['switch']): void => {
    const d = createDevice(p, templateId, { x, y }, { id: `ex-${key}`, ...(switchSpec ? { switchSpec } : {}) })
    p = { ...p, devices: [...p.devices, { ...d, ...extra }] }
    ids.set(key, d.id)
  }
  const link = (a: [string, string], b: [string, string], medium: Link['medium'], vlan: VlanChoice, extra: Partial<Link> = {}): void => {
    const n = p.links.length + 1
    const l: Link = { id: `ex-l${n}`, cableId: `C-${String(n).padStart(3, '0')}`, a: { deviceId: id(a[0]), portId: a[1] }, b: { deviceId: id(b[0]), portId: b[1] }, medium, ...extra }
    p = setLinkVlan({ ...p, links: [...p.links, l] }, l.id, vlan)
  }

  // Régie
  add('gw', 'gateway', 88, 48, { ip: fixe('10.10.10.1') })
  add('sw1', 'switch', 64, 176, { ip: fixe('10.10.10.2'), model: 'Switch de régie 24 PoE+' }, { portCount: 24, poe: 'at', poeBudgetW: 400, sfpPlus: 2, managed: true })
  add('mac', 'show-mac', 40, 360, { ip: fixe('10.20.0.10'), hostname: 'regie-qlab' })
  add('pc', 'media-pc', 240, 360, { ip: fixe('10.40.0.10'), model: 'TouchDesigner', hostname: 'media-1' })
  add('dnt', 'dante-console', 440, 360, { ip: fixe('10.30.0.10') })
  add('lx', 'lighting-console', 640, 360, { ip: fixe('10.50.0.10') })
  add('mqt', 'mqtt-broker', 40, 460, { ip: fixe('10.60.0.2'), hostname: 'mqtt' })
  // Salle
  add('sw2', 'switch', 960, 176, { ip: fixe('10.10.10.3'), model: 'Switch de salle 8 PoE+' }, { portCount: 8, poe: 'at', poeBudgetW: 150, sfpPlus: 2, managed: true })
  add('cam1', 'ptz-ndi', 920, 300, { ip: fixe('10.40.0.21') })
  add('cam2', 'ptz-ndi', 1110, 300, { ip: fixe('10.40.0.22') })
  add('ap', 'ap', 1300, 300, { ip: fixe('10.10.10.4') })
  add('spk1', 'dante-speaker', 920, 420, { ip: DHCP })
  add('spk2', 'dante-speaker', 1110, 420, { ip: DHCP })
  add('iot1', 'esp32-poe', 1300, 420, { ip: fixe('10.60.0.31'), model: 'Capteur de présence' })
  add('iot2', 'esp32-devkit', 1480, 420, { ip: DHCP, model: 'Bouton sans fil' })
  // Scène
  add('pix', 'pixel-controller', 80, 700, { ip: fixe('10.50.0.20'), portState: { OUT1: { universe: 10 } } })
  add('led', 'led-strip', 80, 820, { model: 'Bande pixels 5 m', ledStrip: { type: 'ws2815', volts: 12, wPerM: 14.4, lengthM: 5, pxPerM: 60 } })
  add('dmx', 'dmx-node', 360, 700, { ip: fixe('10.50.0.21'), portState: { 'DMX-1': { universe: 1 }, 'DMX-2': { universe: 2 } } })
  add('fix', 'dmx-fixture', 360, 820, { model: 'Projecteur asservi', dmx: { footprint: 16, address: 1, mode: 'Standard 16 ch' } })
  add('mh1', 'moving-spot', 640, 700, { powerW: 400, dmx: { footprint: 16, address: 1 } })
  add('mh2', 'moving-spot', 900, 700, { powerW: 400, dmx: { footprint: 16, address: 17 } })
  add('mh3', 'moving-spot', 1160, 700, { powerW: 400, dmx: { footprint: 16, address: 33 } })
  add('psu', 'psu', 80, 940, { psu: { volts: 12, amps: 30 } }) // sous LED-1 : son câble DC ne traverse pas la rangée
  add('rgb', 'led-strip', 900, 820, { model: 'Ruban de scène', ledStrip: { type: 'smd-rgb', volts: 12, wPerM: 14.4, lengthM: 10 } })

  link(['gw', 'LAN1'], ['sw1', '1'], 'cat6', TRUNK_ALL, { lengthM: 1 })
  link(['sw1', 'SFP+1'], ['sw2', 'SFP+1'], 'om4', TRUNK_ALL, { lengthM: 30 })
  link(['mac', 'ETH'], ['sw1', '2'], 'cat6', access(20), { lengthM: 3 })
  link(['pc', 'ETH1'], ['sw1', '4'], 'cat6', access(40), { lengthM: 3 })
  link(['dnt', 'PRI'], ['sw1', '6'], 'cat6', access(30), { lengthM: 3 })
  link(['lx', 'ETH1'], ['sw1', '8'], 'cat6', access(50), { lengthM: 5 })
  link(['mqt', 'ETH'], ['sw1', '10'], 'cat6', access(60), { lengthM: 2 })
  link(['pix', 'ETH1'], ['sw1', '12'], 'cat6', access(50), { lengthM: 15 })
  link(['dmx', 'ETH'], ['sw1', '14'], 'cat6', access(50), { lengthM: 15 })
  link(['cam1', 'ETH'], ['sw2', '1'], 'cat6', access(40), { lengthM: 12 })
  link(['cam2', 'ETH'], ['sw2', '2'], 'cat6', access(40), { lengthM: 12 })
  link(['ap', 'ETH'], ['sw2', '3'], 'cat6', { kind: 'trunk', native: 10, tagged: [10, 60] }, { lengthM: 8 })
  link(['spk1', 'ETH'], ['sw2', '4'], 'cat6', access(30), { lengthM: 20 })
  link(['spk2', 'ETH'], ['sw2', '5'], 'cat6', access(30), { lengthM: 20 })
  link(['iot1', 'ETH'], ['sw2', '6'], 'cat6', access(60), { lengthM: 10 })
  link(['iot2', 'WIFI'], ['ap', 'WIFI'], 'wifi', access(60), { wifi: { ssid: 'AVWAN-IOT', band: '2.4' } })
  link(['pix', 'OUT1'], ['led', 'IN'], 'pixel', NONE, { lengthM: 2 })
  link(['dmx', 'DMX-1'], ['fix', 'DMX-IN'], 'dmx', NONE, { lengthM: 10 })
  link(['dmx', 'DMX-2'], ['mh1', 'DMX-IN'], 'dmx', NONE, { lengthM: 8 })
  link(['mh1', 'DMX-OUT'], ['mh2', 'DMX-IN'], 'dmx', NONE, { lengthM: 3 })
  link(['mh2', 'DMX-OUT'], ['mh3', 'DMX-IN'], 'dmx', NONE, { lengthM: 3 })
  link(['psu', 'DC-OUT-1'], ['led', 'DC-IN'], 'dc', NONE, { lengthM: 2 })
  link(['psu', 'DC-OUT-2'], ['rgb', 'DC-IN'], 'dc', NONE, { lengthM: 2 })

  p = {
    ...p,
    zones: [
      { id: 'ex-z-regie', name: 'Régie', color: '#F2A93B', rect: { x: 0, y: 0, w: 860, h: 560 }, ownPdfPage: true },
      { id: 'ex-z-salle', name: 'Salle', color: '#3E8EF7', rect: { x: 900, y: 0, w: 760, h: 560 }, ownPdfPage: true },
      { id: 'ex-z-scene', name: 'Scène', color: '#3DBE6E', rect: { x: 0, y: 600, w: 1660, h: 440 }, ownPdfPage: false }
    ]
  }
  return assignZones(p)
}
