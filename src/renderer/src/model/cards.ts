import type { Card, Connector, Device, PortDef, Project } from './types'
import type { Messages } from '../../../shared/i18n/messages'
import { newId } from './project'
import { portDisplayLabel } from './rules'

// Cartes de ports d'un appareil (spec cartes-ip-vms § 4.2). Un port sans cardId (ou inconnu) est dans « Intégré ».
export const ONBOARD = ''

export type CardPresetId = 'gpu-dp' | 'gpu-hdmi' | 'capture-sdi' | 'nic-rj45' | 'nic-sfpp' | 'empty'
export const CARD_PRESETS: Record<CardPresetId, { connector?: Connector; count: number; nameKey: 'gpu' | 'capture' | 'nic' | 'card' }> = {
  'gpu-dp': { connector: 'displayport', count: 4, nameKey: 'gpu' },
  'gpu-hdmi': { connector: 'hdmi', count: 4, nameKey: 'gpu' },
  'capture-sdi': { connector: 'sdi', count: 4, nameKey: 'capture' },
  'nic-rj45': { connector: 'rj45', count: 2, nameKey: 'nic' },
  'nic-sfpp': { connector: 'sfp+', count: 2, nameKey: 'nic' },
  empty: { count: 0, nameKey: 'card' }
}

const SHORT: Partial<Record<Connector, string>> = {
  displayport: 'DP', hdmi: 'HDMI', sdi: 'SDI', usb: 'USB', serial: 'COM', dc: 'DC', dmx: 'DMX', pixel: 'PIX'
}
const ETH: ReadonlySet<Connector> = new Set<Connector>(['rj45', 'sfp', 'sfp+'])

const cardOf = (device: Device, port: PortDef): string =>
  port.cardId !== undefined && (device.cards ?? []).some((c) => c.id === port.cardId) ? port.cardId : ONBOARD

// « Intégré » d'abord (nom '' tant qu'il n'est pas renommé : l'interface affiche le libellé traduit), puis les cartes.
export function cardGroups(device: Device): Array<{ cardId: string; name: string; ports: PortDef[] }> {
  const groups = [{ cardId: ONBOARD, name: device.onboardName ?? '' }, ...(device.cards ?? []).map((c) => ({ cardId: c.id, name: c.name }))]
  return groups.map((g) => ({ ...g, ports: device.ports.filter((p) => cardOf(device, p) === g.cardId) }))
}

const firstFree = (used: ReadonlySet<number>, from: number): number => {
  let n = from
  while (used.has(n)) n++
  return n
}

const numbersOf = (labels: readonly string[], prefix: RegExp): Set<number> =>
  new Set(labels.flatMap((l) => {
    const m = prefix.exec(l)
    return m ? [Number(m[1])] : []
  }))

export function nextPortLabel(device: Device, cardId: string, connector: Connector): string {
  const all = device.ports.map((p) => p.label)
  if (ETH.has(connector)) return `eth${firstFree(numbersOf(all, /^eth(\d+)$/), 0)}`
  if (connector === 'wifi') return `wlan${firstFree(numbersOf(all, /^wlan(\d+)$/), 0)}`
  const short = SHORT[connector] ?? connector.toUpperCase()
  const inCard = device.ports.filter((p) => cardOf(device, p) === cardId).map((p) => p.label)
  const esc = short.replace(/[+]/g, '\\+')
  return `${short} ${firstFree(numbersOf(inCard, new RegExp(`^${esc} (\\d+)$`)), 1)}`
}

export function nextPortId(device: Device, label: string): string {
  const base = label.replace(/[^A-Za-z0-9+_-]/g, '-')
  const taken = new Set(device.ports.map((p) => p.id))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export function addPort(device: Device, cardId: string, connector: Connector): Device {
  const label = nextPortLabel(device, cardId, connector)
  const port: PortDef = { id: nextPortId(device, label), label, connector, ...(cardId !== ONBOARD ? { cardId } : {}) }
  return { ...device, ports: [...device.ports, port] }
}

// Nom par défaut, numéroté au premier numéro libre parmi les cartes de l'appareil (« GPU 1 », « GPU 2 »…).
export function defaultCardName(device: Device, preset: CardPresetId, m: Messages): string {
  const make = m.model.cards[CARD_PRESETS[preset].nameKey]
  const names = new Set((device.cards ?? []).map((c) => c.name))
  let n = 1
  while (names.has(make({ n }))) n++
  return make({ n })
}

export function addCard(device: Device, preset: CardPresetId, name: string, makeId: () => string = newId): Device {
  const card: Card = { id: makeId(), name }
  let d: Device = { ...device, cards: [...(device.cards ?? []), card] }
  const { connector, count } = CARD_PRESETS[preset]
  for (let i = 0; connector && i < count; i++) d = addPort(d, card.id, connector)
  return d
}

// Retire des ports, leur réglage et leurs câbles ; vide le pont des vNIC qui y pointaient.
export function removePorts(project: Project, deviceId: string, portIds: readonly string[]): { project: Project; unplugged: number } {
  const gone = new Set(portIds)
  const hit = (r: { deviceId: string; portId: string }): boolean => r.deviceId === deviceId && gone.has(r.portId)
  const links = project.links.filter((l) => !hit(l.a) && !hit(l.b))
  const devices = project.devices.map((d) =>
    d.id !== deviceId
      ? d
      : { ...d, ports: d.ports.filter((p) => !gone.has(p.id)), portState: Object.fromEntries(Object.entries(d.portState).filter(([k]) => !gone.has(k))) }
  )
  const vms = project.vms?.map((vm) =>
    vm.hostId !== deviceId || !vm.vnics.some((n) => n.bridgePortId !== undefined && gone.has(n.bridgePortId))
      ? vm
      : { ...vm, vnics: vm.vnics.map((n) => (n.bridgePortId !== undefined && gone.has(n.bridgePortId) ? (({ bridgePortId: _b, ...rest }) => rest)(n) : n)) }
  )
  return { project: { ...project, devices, links, ...(vms ? { vms } : {}) }, unplugged: project.links.length - links.length }
}

export function removeCard(project: Project, deviceId: string, cardId: string): { project: Project; unplugged: number } {
  const device = project.devices.find((d) => d.id === deviceId)
  if (!device || cardId === ONBOARD) return { project, unplugged: 0 }
  const portIds = device.ports.filter((p) => cardOf(device, p) === cardId).map((p) => p.id)
  const r = removePorts(project, deviceId, portIds)
  return {
    ...r,
    project: { ...r.project, devices: r.project.devices.map((d) => (d.id === deviceId ? { ...d, cards: (d.cards ?? []).filter((c) => c.id !== cardId) } : d)) }
  }
}

// Libellé d'un port dans les rapports : préfixé du nom de sa carte hors « Intégré » (« Carte réseau 1 › eth2 »).
export function portLabelWithCard(device: Device, port: PortDef, m: Messages): string {
  const label = portDisplayLabel(device, port, m)
  const card = cardOf(device, port) === ONBOARD ? undefined : device.cards?.find((c) => c.id === port.cardId)
  return card ? `${card.name} › ${label}` : label
}

