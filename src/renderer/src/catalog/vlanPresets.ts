import type { Vlan } from '../model/types'

type Unifi = Vlan['unifi']

const base: Unifi = {
  igmpSnooping: false,
  querier: false,
  forwardUnknownMulticast: 'drop',
  floodKnownProtocols: false,
  fastLeave: false,
  mdnsProxy: 'off',
  networkIsolation: false,
  jumboFrames: false
}

// Réglages UniFi Pro AV pour Dante, NDI et l'éclairage (spec § 7.3, recherche § 3.3).
const avMulticast: Unifi = {
  ...base,
  igmpSnooping: true,
  querier: true,
  forwardUnknownMulticast: 'router-ports',
  floodKnownProtocols: true,
  fastLeave: true,
  networkIsolation: true
}

export const VLAN_PRESETS: readonly Vlan[] = [
  { id: 10, name: 'Gestion', short: 'MGMT', color: { dark: '#8E969F', light: '#646C75' }, subnet: '10.10.10.0/24', gateway: '10.10.10.1', dhcp: { enabled: true }, internet: true, unifi: { ...base, networkIsolation: true } },
  { id: 20, name: 'Contrôle / OSC', short: 'CTRL', color: { dark: '#A78BFA', light: '#6E4FD0' }, subnet: '10.20.0.0/24', gateway: '10.20.0.1', dhcp: { enabled: true }, internet: true, unifi: { ...base, igmpSnooping: true, querier: true, forwardUnknownMulticast: 'router-ports', floodKnownProtocols: true, mdnsProxy: 'auto' } },
  { id: 30, name: 'Dante A', short: 'DANTE-A', color: { dark: '#E5484D', light: '#C42B30' }, subnet: '10.30.0.0/24', gateway: '10.30.0.1', dhcp: { enabled: true }, internet: false, unifi: { ...avMulticast, proAvProfile: 'Dante Audio' }, note: 'EEE désactivé sur les ports Dante. Jamais en Wi-Fi.' },
  { id: 31, name: 'Dante B', short: 'DANTE-B', color: { dark: '#E86FB0', light: '#B2367C' }, subnet: '172.31.0.0/16', dhcp: { enabled: false }, internet: false, unifi: { ...avMulticast, proAvProfile: 'Dante Audio' }, note: 'Réseau secondaire : ne doit jamais toucher Dante A. Idéalement physiquement séparé.' },
  { id: 40, name: 'NDI', short: 'NDI', color: { dark: '#3E8EF7', light: '#2563C9' }, subnet: '10.40.0.0/23', gateway: '10.40.0.1', dhcp: { enabled: true }, internet: false, unifi: { ...avMulticast }, note: 'NDI recommande QoS et trames jumbo désactivées. Discovery Server : TCP 5959.' },
  { id: 50, name: 'Éclairage', short: 'LX', color: { dark: '#3DBE6E', light: '#1E7F45' }, subnet: '10.50.0.0/24', gateway: '10.50.0.1', dhcp: { enabled: false }, internet: false, unifi: { ...avMulticast }, note: 'sACN (UDP 5568) et Art-Net (UDP 6454, en unicast).' },
  { id: 60, name: 'IoT / MQTT', short: 'IOT', color: { dark: '#F2C94C', light: '#8A6A00' }, subnet: '10.60.0.0/24', gateway: '10.60.0.1', dhcp: { enabled: true }, internet: false, unifi: { ...base, igmpSnooping: true, querier: true, networkIsolation: true }, note: 'MQTT : 1883 (8883 en TLS). ESP32 : Wi-Fi 2,4 GHz seulement.' },
  { id: 70, name: 'Caméras', short: 'CAM', color: { dark: '#F08A3C', light: '#B4561A' }, subnet: '10.70.0.0/24', gateway: '10.70.0.1', dhcp: { enabled: true }, internet: false, unifi: { ...base, igmpSnooping: true, querier: true, networkIsolation: true } },
  { id: 80, name: 'Médias', short: 'MEDIA', color: { dark: '#36C2C9', light: '#14797E' }, subnet: '10.80.0.0/24', gateway: '10.80.0.1', dhcp: { enabled: true }, internet: false, unifi: { ...base, networkIsolation: true }, note: 'Trames jumbo possibles si tout le chemin les supporte.' },
  { id: 99, name: 'Invités', short: 'GUEST', color: { dark: '#C9B28A', light: '#7D6644' }, subnet: '10.99.0.0/24', gateway: '10.99.0.1', dhcp: { enabled: true }, internet: true, unifi: { ...base, networkIsolation: true } }
]

export const DEFAULT_PROJECT_VLAN_IDS = [10, 20, 30, 40, 60] as const

export function vlanPreset(id: number): Vlan {
  const preset = VLAN_PRESETS.find((v) => v.id === id)
  if (!preset) throw new Error(`Preset VLAN inconnu : ${id}`)
  return structuredClone(preset)
}
