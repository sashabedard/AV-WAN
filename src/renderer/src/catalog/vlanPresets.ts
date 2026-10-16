import type { Vlan } from '../model/types'
import { loc, type Localized } from '../../../shared/i18n/localized'
import type { Lang } from '../../../shared/i18n/lang'

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

// VLAN prédéfini : nom et note dans les deux langues. Copié dans le projet par vlanFromPreset, dans la langue de l'interface.
export type VlanPreset = Omit<Vlan, 'name' | 'note'> & { name: Localized; note?: Localized }

export const VLAN_PRESETS: readonly VlanPreset[] = [
  { id: 10, name: { fr: 'Gestion', en: 'Management' }, short: 'MGMT', color: { dark: '#8E969F', light: '#646C75' }, subnet: '10.10.10.0/24', gateway: '10.10.10.1', dhcp: { enabled: true }, internet: true, unifi: { ...base, networkIsolation: true } },
  { id: 20, name: { fr: 'Contrôle / OSC', en: 'Control / OSC' }, short: 'CTRL', color: { dark: '#A78BFA', light: '#6E4FD0' }, subnet: '10.20.0.0/24', gateway: '10.20.0.1', dhcp: { enabled: true }, internet: true, unifi: { ...base, igmpSnooping: true, querier: true, forwardUnknownMulticast: 'router-ports', floodKnownProtocols: true, mdnsProxy: 'auto' } },
  { id: 30, name: { fr: 'Dante A', en: 'Dante A' }, short: 'DANTE-A', color: { dark: '#E5484D', light: '#C42B30' }, subnet: '10.30.0.0/24', gateway: '10.30.0.1', dhcp: { enabled: true }, internet: false, unifi: { ...avMulticast, proAvProfile: 'Dante Audio' }, note: { fr: 'EEE désactivé sur les ports Dante. Jamais en Wi-Fi.', en: 'EEE disabled on Dante ports. Never over Wi-Fi.' } },
  { id: 31, name: { fr: 'Dante B', en: 'Dante B' }, short: 'DANTE-B', color: { dark: '#E86FB0', light: '#B2367C' }, subnet: '172.31.0.0/16', dhcp: { enabled: false }, internet: false, unifi: { ...avMulticast, proAvProfile: 'Dante Audio' }, note: { fr: 'Réseau secondaire : ne doit jamais toucher Dante A. Idéalement physiquement séparé.', en: 'Secondary network: must never touch Dante A. Ideally physically separate.' } },
  { id: 40, name: { fr: 'NDI', en: 'NDI' }, short: 'NDI', color: { dark: '#3E8EF7', light: '#2563C9' }, subnet: '10.40.0.0/23', gateway: '10.40.0.1', dhcp: { enabled: true }, internet: false, unifi: { ...avMulticast }, note: { fr: 'NDI recommande QoS et trames jumbo désactivées. Discovery Server : TCP 5959.', en: 'NDI recommends QoS and jumbo frames disabled. Discovery Server: TCP 5959.' } },
  { id: 50, name: { fr: 'Éclairage', en: 'Lighting' }, short: 'LX', color: { dark: '#3DBE6E', light: '#1E7F45' }, subnet: '10.50.0.0/24', gateway: '10.50.0.1', dhcp: { enabled: false }, internet: false, unifi: { ...avMulticast }, note: { fr: 'sACN (UDP 5568) et Art-Net (UDP 6454, en unicast).', en: 'sACN (UDP 5568) and Art-Net (UDP 6454, unicast).' } },
  { id: 60, name: { fr: 'IoT / MQTT', en: 'IoT / MQTT' }, short: 'IOT', color: { dark: '#F2C94C', light: '#8A6A00' }, subnet: '10.60.0.0/24', gateway: '10.60.0.1', dhcp: { enabled: true }, internet: false, unifi: { ...base, igmpSnooping: true, querier: true, networkIsolation: true }, note: { fr: 'MQTT : 1883 (8883 en TLS). ESP32 : Wi-Fi 2,4 GHz seulement.', en: 'MQTT: 1883 (8883 over TLS). ESP32: 2.4 GHz Wi-Fi only.' } },
  { id: 70, name: { fr: 'Caméras', en: 'Cameras' }, short: 'CAM', color: { dark: '#F08A3C', light: '#B4561A' }, subnet: '10.70.0.0/24', gateway: '10.70.0.1', dhcp: { enabled: true }, internet: false, unifi: { ...base, igmpSnooping: true, querier: true, networkIsolation: true } },
  { id: 80, name: { fr: 'Médias', en: 'Media' }, short: 'MEDIA', color: { dark: '#36C2C9', light: '#14797E' }, subnet: '10.80.0.0/24', gateway: '10.80.0.1', dhcp: { enabled: true }, internet: false, unifi: { ...base, networkIsolation: true }, note: { fr: 'Trames jumbo possibles si tout le chemin les supporte.', en: 'Jumbo frames possible if the whole path supports them.' } },
  { id: 99, name: { fr: 'Invités', en: 'Guests' }, short: 'GUEST', color: { dark: '#C9B28A', light: '#7D6644' }, subnet: '10.99.0.0/24', gateway: '10.99.0.1', dhcp: { enabled: true }, internet: true, unifi: { ...base, networkIsolation: true } }
]

export const DEFAULT_PROJECT_VLAN_IDS = [10, 20, 30, 40, 60] as const

export function vlanFromPreset(p: VlanPreset, lang: Lang): Vlan {
  const { name, note, ...rest } = structuredClone(p)
  return { ...rest, name: loc(name, lang), ...(note ? { note: loc(note, lang) } : {}) }
}

export function vlanPreset(id: number, lang: Lang): Vlan {
  const preset = VLAN_PRESETS.find((v) => v.id === id)
  // i18n-ignore : erreur de développeur, jamais affichée
  if (!preset) throw new Error(`Preset VLAN inconnu : ${id}`)
  return vlanFromPreset(preset, lang)
}
