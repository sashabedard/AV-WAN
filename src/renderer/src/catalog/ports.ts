import type { PortDef } from '../model/types'

type Extra = Partial<Omit<PortDef, 'id' | 'connector'>>
export type SimpleConnector = 'usb' | 'dmx' | 'pixel' | 'hdmi' | 'sdi' | 'serial' | 'dc'

export function rj45(id: string, extra: Extra = {}): PortDef {
  return { id, label: id, connector: 'rj45', speedMbps: 1000, ...extra }
}
export function sfp(id: string, label: string = id): PortDef {
  return { id, label, connector: 'sfp', speedMbps: 1000 }
}
export function sfpPlus(id: string, label: string = id): PortDef {
  return { id, label, connector: 'sfp+', speedMbps: 10000 }
}
export function wifi(): PortDef {
  return { id: 'WIFI', label: 'Wi-Fi', connector: 'wifi' }
}
export function simple(connector: SimpleConnector, id: string, label: string = id): PortDef {
  return { id, label, connector }
}
export function range(prefix: string, from: number, to: number): string[] {
  const out: string[] = []
  for (let i = from; i <= to; i++) out.push(`${prefix}${i}`)
  return out
}

// Panneau de brassage : avant (A1…An, rangée du haut) et arrière (R1…Rn, rangée du bas).
export function patchPanelPorts(count: number): PortDef[] {
  const out: PortDef[] = []
  for (let i = 1; i <= count; i++) out.push({ id: `A${i}`, label: `A${i}`, connector: 'rj45', speedMbps: 1000, row: 'top' })
  for (let i = 1; i <= count; i++) out.push({ id: `R${i}`, label: `R${i}`, connector: 'rj45', speedMbps: 1000, row: 'bottom' })
  return out
}
