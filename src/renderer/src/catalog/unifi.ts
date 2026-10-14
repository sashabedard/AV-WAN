// src/renderer/src/catalog/unifi.ts
import type { Vlan } from '../model/types'

type Unifi = Vlan['unifi']

// Noms exacts des réglages UniFi (spec § 9.4). La fiche VLAN de l'inspecteur et le PDF les partagent.
export const UNIFI_LABELS: Record<keyof Unifi, string> = {
  igmpSnooping: 'IGMP Snooping',
  querier: 'Create New Querier Switch',
  forwardUnknownMulticast: 'Forward Unknown Multicast Traffic',
  floodKnownProtocols: 'Flood Known Protocols',
  fastLeave: 'Fast Leave',
  mdnsProxy: 'mDNS Proxy',
  networkIsolation: 'Network Isolation',
  proAvProfile: 'Profil de port ProAV',
  jumboFrames: 'Jumbo Frames'
}

export const FORWARD_UNKNOWN_CHOICES: ReadonlyArray<{ value: Unifi['forwardUnknownMulticast']; label: string }> = [
  { value: 'router-ports', label: 'Multicast Router Ports' },
  { value: 'flood', label: 'Flood' },
  { value: 'drop', label: 'Drop' }
]

export const MDNS_CHOICES: ReadonlyArray<{ value: Unifi['mdnsProxy']; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'auto', label: 'Auto' },
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom' }
]

export const PROAV_PROFILES = ['Dante Audio', 'NDI with Dante Audio'] as const
