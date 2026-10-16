// src/renderer/src/reports/vlanSheets.ts
import type { Project, Vlan } from '../model/types'
import { vlanMembers } from '../model/derive'
import { messages } from '../../../shared/i18n/messages'
import { FORWARD_UNKNOWN_CHOICES, MDNS_CHOICES, unifiLabels } from '../catalog/unifi'
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
  const labels = unifiLabels(messages('fr')) // plan 6 : langue des documents à la Task 12
  const rows: Array<[string, string]> = [[labels.igmpSnooping, onOff(u.igmpSnooping)]]
  if (u.igmpSnooping) {
    rows.push(
      [labels.querier, onOff(u.querier)],
      [labels.forwardUnknownMulticast, FORWARD_UNKNOWN_CHOICES.find((c) => c.value === u.forwardUnknownMulticast)?.label ?? u.forwardUnknownMulticast],
      [labels.floodKnownProtocols, onOff(u.floodKnownProtocols)],
      [labels.fastLeave, onOff(u.fastLeave)]
    )
  }
  rows.push(
    [labels.mdnsProxy, MDNS_CHOICES.find((c) => c.value === u.mdnsProxy)?.label ?? u.mdnsProxy],
    [labels.networkIsolation, onOff(u.networkIsolation)],
    [labels.proAvProfile, u.proAvProfile ?? 'Aucun'],
    [labels.jumboFrames, onOff(u.jumboFrames)]
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
