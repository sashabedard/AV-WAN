import type { Connector, Device, IpConfig, PortDef, Project } from './types'

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

export function portIps(device: Device, portId: string): IpConfig[] {
  return device.portState[portId]?.ips ?? []
}

// Toutes les IP de l'appareil, port réseau par port réseau ; `index` = rang dans la liste du port.
export function deviceIps(device: Device): Array<{ port: PortDef; ip: IpConfig; index: number }> {
  return device.ports.filter(isNetworkPort).flatMap((port) => portIps(device, port.id).map((ip, index) => ({ port, ip, index })))
}

// Réécrit la liste d'IP d'un port ; une liste vide retire la clé `ips`.
export function editPortIps(project: Project, deviceId: string, portId: string, fn: (ips: IpConfig[]) => IpConfig[]): Project {
  return {
    ...project,
    devices: project.devices.map((d) => {
      if (d.id !== deviceId) return d
      const { ips: _old, ...rest } = d.portState[portId] ?? {}
      const ips = fn(portIps(d, portId))
      return { ...d, portState: { ...d.portState, [portId]: ips.length > 0 ? { ...rest, ips } : rest } }
    })
  }
}
