// src/renderer/src/reports/portMaps.ts
import type { Device, PortDef, PortState, Project, SwitchSpec } from '../model/types'
import { linksOnPort, sameRef } from '../model/rules'
import { POE_LABELS, linkPoe, switchPoeUsage, type LinkPoe } from '../model/derive'
import { switchSummary } from '../catalog/switch'
import { messages } from '../../../shared/i18n/messages'
import type { Lang } from '../../../shared/i18n/lang'
import { DASH, compareText, formatNumber, ipLabel, poeLabel, portRefLabel, taggedLabel, vlanName } from './format'

export interface PortMapRow {
  portId: string
  port: string
  peer: string
  cableId: string
  mode: string
  native: string
  tagged: string
  poe: string
  fill?: string // couleur du VLAN natif (thème clair), pour la façade imprimée
  trunk: boolean
  poeActive: boolean
}

export interface PortMap {
  deviceId: string
  name: string
  summary: string
  model?: string
  ip: string
  poe?: string // « PoE 123 / 150 W »
  rows: PortMapRow[]
}

function portPoe(port: PortDef, st: PortState, poe: LinkPoe, supplying: boolean, lang: Lang): string {
  const c = messages(lang).reports.common
  if (!port.poeOut) return DASH
  if (st.poeEnabled === false) return c.disabled
  if (supplying) return poeLabel(poe, lang)
  return c.poeAvailable({ label: POE_LABELS[port.poeOut] })
}

// Carte des ports de chaque switch (spec § 11.1, section 3). Le réglage VLAN est lu sur le port du switch lui-même.
export function portMaps(project: Project, lang: Lang): PortMap[] {
  const m = messages(lang)
  return project.devices
    .filter((d): d is Device & { switch: SwitchSpec } => d.switch !== undefined)
    .sort((a, b) => compareText(a.name, b.name, lang))
    .map((device) => {
      const usage = switchPoeUsage(project, device.id)
      const rows = device.ports.map((port): PortMapRow => {
        const ref = { deviceId: device.id, portId: port.id }
        const link = linksOnPort(project, ref)[0]
        const st = device.portState[port.id] ?? {}
        const trunk = st.mode === 'trunk'
        const poe: LinkPoe = link ? linkPoe(project, link) : { active: false }
        const supplying = poe.active && poe.pse !== undefined && sameRef(poe.pse, ref)
        const fill = st.nativeVlan !== undefined ? project.vlans.find((v) => v.id === st.nativeVlan)?.color.light : undefined
        return {
          portId: port.id,
          port: port.label,
          peer: link ? portRefLabel(project, sameRef(link.a, ref) ? link.b : link.a) : DASH,
          cableId: link?.cableId ?? DASH,
          mode: trunk ? m.reports.common.trunk : st.nativeVlan !== undefined ? m.reports.common.access : DASH,
          native: st.nativeVlan !== undefined ? vlanName(project, st.nativeVlan) : DASH,
          tagged: trunk ? taggedLabel(st.taggedVlans ?? 'all', lang) : DASH,
          poe: portPoe(port, st, poe, supplying, lang),
          ...(fill ? { fill } : {}),
          trunk,
          poeActive: supplying
        }
      })
      const budget = usage.budgetW !== undefined ? ` / ${formatNumber(usage.budgetW, lang)}` : ''
      return {
        deviceId: device.id,
        name: device.name,
        summary: switchSummary(device.switch, m),
        ...(device.model ? { model: device.model } : {}),
        ip: ipLabel(device.ip, lang),
        ...(device.switch.poe !== 'none' ? { poe: `PoE ${formatNumber(usage.usedW, lang)}${budget} W` } : {}),
        rows
      }
    })
}
