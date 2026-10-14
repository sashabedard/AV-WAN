import type { PortDef } from '../model/types'

type Extra = Partial<Omit<PortDef, 'id' | 'connector'>>
export type SimpleConnector = 'usb' | 'dmx' | 'pixel' | 'hdmi' | 'sdi' | 'serial'

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
