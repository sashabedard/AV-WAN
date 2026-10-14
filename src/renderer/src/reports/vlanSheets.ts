// src/renderer/src/reports/vlanSheets.ts
import type { Project, Vlan } from '../model/types'
import { vlanMembers } from '../model/derive'
import { FORWARD_UNKNOWN_CHOICES, MDNS_CHOICES, UNIFI_LABELS } from '../catalog/unifi'
import { DASH, compareText } from './format'

export interface VlanSheet {
  id: number
  name: string
  short: string
  color: string // couleur du thème clair (le PDF est toujours clair)
  network: Array<[string, string]>
  unifi: Array<[string, string]>
  members: string[]
  cables: number
  note?: string
}

const onOff = (b: boolean): string => (b ? 'Activé' : 'Désactivé')

// Réglages UniFi sous leurs noms exacts. Les sous-réglages de l'IGMP n'apparaissent que s'il est activé.
export function unifiRows(u: Vlan['unifi']): Array<[string, string]> {
  const rows: Array<[string, string]> = [[UNIFI_LABELS.igmpSnooping, onOff(u.igmpSnooping)]]
  if (u.igmpSnooping) {
    rows.push(
      [UNIFI_LABELS.querier, onOff(u.querier)],
      [UNIFI_LABELS.forwardUnknownMulticast, FORWARD_UNKNOWN_CHOICES.find((c) => c.value === u.forwardUnknownMulticast)?.label ?? u.forwardUnknownMulticast],
      [UNIFI_LABELS.floodKnownProtocols, onOff(u.floodKnownProtocols)],
      [UNIFI_LABELS.fastLeave, onOff(u.fastLeave)]
    )
  }
  rows.push(
    [UNIFI_LABELS.mdnsProxy, MDNS_CHOICES.find((c) => c.value === u.mdnsProxy)?.label ?? u.mdnsProxy],
    [UNIFI_LABELS.networkIsolation, onOff(u.networkIsolation)],
    [UNIFI_LABELS.proAvProfile, u.proAvProfile ?? 'Aucun'],
    [UNIFI_LABELS.jumboFrames, onOff(u.jumboFrames)]
  )
  return rows
}

// Fiches VLAN (spec § 11.1, section 5), par numéro croissant.
export function vlanSheets(project: Project): VlanSheet[] {
  return [...project.vlans]
    .sort((a, b) => a.id - b.id)
    .map((v) => {
      const m = vlanMembers(project, v.id)
      const names = m.deviceIds.map((id) => project.devices.find((d) => d.id === id)?.name ?? id).sort(compareText)
      const dhcp = v.dhcp?.enabled ? (v.dhcp.range ? `Oui · ${v.dhcp.range}` : 'Oui') : 'Non'
      return {
        id: v.id,
        name: v.name,
        short: v.short,
        color: v.color.light,
        network: [
          ['Sous-réseau', v.subnet ?? DASH],
          ['Passerelle', v.gateway ?? DASH],
          ['DHCP', dhcp],
          ['Accès Internet', v.internet ? 'Oui' : 'Non']
        ],
        unifi: unifiRows(v.unifi),
        members: names,
        cables: m.linkIds.length,
        ...(v.note ? { note: v.note } : {})
      }
    })
}
