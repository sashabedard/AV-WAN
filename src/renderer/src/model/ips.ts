import type { Connector, Device, IpConfig, PortDef } from './types'

// Connecteurs qui portent une ou plusieurs IP (spec cartes-ip-vms § 4.1).
export const NETWORK_CONNECTORS: ReadonlySet<Connector> = new Set<Connector>(['rj45', 'sfp', 'sfp+', 'wifi'])

export function isNetworkPort(port: PortDef): boolean {
  return NETWORK_CONNECTORS.has(port.connector)
}

// Adresse principale (tuile, fiches) : la 1ʳᵉ IP du 1ᵉʳ port réseau qui en a une.
export function primaryIp(device: Device): IpConfig | undefined {
  for (const port of device.ports) {
    if (!isNetworkPort(port)) continue
    const ip = device.portState[port.id]?.ips?.[0]
    if (ip) return ip
  }
  return undefined
}

// Place une adresse en tête du 1ᵉʳ port réseau (projets d'exemple, bancs de rendu). Sans port réseau : inchangé.
export function withPrimaryIp(device: Device, ip: IpConfig): Device {
  const port = device.ports.find(isNetworkPort)
  if (!port) return device
  const prev = device.portState[port.id] ?? {}
  return { ...device, portState: { ...device.portState, [port.id]: { ...prev, ips: [ip, ...(prev.ips ?? [])] } } }
}
