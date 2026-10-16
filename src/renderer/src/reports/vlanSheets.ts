// src/renderer/src/reports/vlanSheets.ts
import type { Project, Vlan } from '../model/types'
import { vlanMembers } from '../model/derive'
import { messages } from '../../../shared/i18n/messages'
import type { Lang } from '../../../shared/i18n/lang'
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

const onOff = (b: boolean, lang: Lang): string => (b ? messages(lang).reports.vlan.on : messages(lang).reports.vlan.off)

// Réglages UniFi sous leurs noms exacts. Les sous-réglages de l'IGMP n'apparaissent que s'il est activé.
export function unifiRows(u: Vlan['unifi'], lang: Lang): Array<[string, string]> {
  const m = messages(lang)
  const labels = unifiLabels(m)
  const rows: Array<[string, string]> = [[labels.igmpSnooping, onOff(u.igmpSnooping, lang)]]
  if (u.igmpSnooping) {
    rows.push(
      [labels.querier, onOff(u.querier, lang)],
      [labels.forwardUnknownMulticast, FORWARD_UNKNOWN_CHOICES.find((c) => c.value === u.forwardUnknownMulticast)?.label ?? u.forwardUnknownMulticast],
      [labels.floodKnownProtocols, onOff(u.floodKnownProtocols, lang)],
      [labels.fastLeave, onOff(u.fastLeave, lang)]
    )
  }
  rows.push(
    [labels.mdnsProxy, MDNS_CHOICES.find((c) => c.value === u.mdnsProxy)?.label ?? u.mdnsProxy],
    [labels.networkIsolation, onOff(u.networkIsolation, lang)],
    [labels.proAvProfile, u.proAvProfile ?? m.reports.vlan.none],
    [labels.jumboFrames, onOff(u.jumboFrames, lang)]
  )
  return rows
}

// Fiches VLAN (spec § 11.1, section 5), par numéro croissant.
export function vlanSheets(project: Project, lang: Lang): VlanSheet[] {
  const c = messages(lang).reports.vlan
  return [...project.vlans]
    .sort((a, b) => a.id - b.id)
    .map((v) => {
      const m = vlanMembers(project, v.id)
      const names = m.deviceIds.map((id) => project.devices.find((d) => d.id === id)?.name ?? id).sort((a, b) => compareText(a, b, lang))
      const dhcp = v.dhcp?.enabled ? (v.dhcp.range ? c.dhcpRange({ range: v.dhcp.range }) : c.yes) : c.no
      return {
        id: v.id,
        name: v.name,
        short: v.short,
        color: v.color.light,
        network: [
          [c.subnet, v.subnet ?? DASH],
          [c.gateway, v.gateway ?? DASH],
          [c.dhcp, dhcp],
          [c.internet, v.internet ? c.yes : c.no]
        ],
        unifi: unifiRows(v.unifi, lang),
        members: names,
        cables: m.linkIds.length,
        ...(v.note ? { note: v.note } : {})
      }
    })
}
