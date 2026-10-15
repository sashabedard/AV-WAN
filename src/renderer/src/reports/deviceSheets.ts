import type { Project } from '../model/types'
import { linksOnPort } from '../model/rules'
import { getTemplate } from '../catalog'
import { connection, type Connection } from './connections'
import { patchIndex } from '../model/dmx'
import { dmxSummary } from './patch'
import { DASH, compareText, ipLabel } from './format'

const NETWORK_CONNECTORS = new Set<string>(['rj45', 'sfp', 'sfp+', 'wifi'])

export interface DeviceSheetLine {
  port: string
  connection: Connection
  text: string
}

export interface DeviceSheet {
  deviceId: string
  name: string
  kind: string // nom du gabarit
  model?: string
  ip: string
  networked: boolean // au moins une prise réseau (RJ45, SFP, SFP+, Wi-Fi) : sinon pas d’IP à afficher
  hostname?: string
  zone?: string
  note?: string
  lines: DeviceSheetLine[]
  extras: string[] // lignes en plus (patch DMX…), une par ligne imprimée
}

// « ETH › SW-2 · port 1 · PoE+ actif (25 W) · VLAN 40 NDI · C-010 Cat6 12 m »
export function sheetLineText(port: string, c: Connection): string {
  const parts = [`${port} › ${c.toLabel}`]
  if (c.poe.active) parts.push(c.poeLabel)
  if (c.vlan.kind === 'access') parts.push(`VLAN ${c.nativeLabel}`)
  if (c.vlan.kind === 'trunk') parts.push(`Trunk${c.nativeLabel !== DASH ? ` natif ${c.nativeLabel}` : ''} · étiquetés : ${c.taggedLabel}`)
  parts.push([c.cableId, c.medium, ...(c.lengthM !== undefined ? [c.lengthLabel] : [])].join(' '))
  if (c.note) parts.push(c.note)
  return parts.join(' · ')
}

// Fiches des appareils qui ne sont pas des switchs (spec § 11.1, section 2), triées par nom.
export function deviceSheets(project: Project): DeviceSheet[] {
  const index = patchIndex(project)
  return project.devices
    .filter((d) => d.switch === undefined)
    .sort((a, b) => compareText(a.name, b.name))
    .map((device) => {
      const lines = device.ports.flatMap((port) => {
        const ref = { deviceId: device.id, portId: port.id }
        return linksOnPort(project, ref)
          .sort((x, y) => compareText(x.cableId, y.cableId))
          .map((l) => {
            const c = connection(project, l, ref)
            return { port: port.label, connection: c, text: sheetLineText(port.label, c) }
          })
      })
      const patch = index.entries.get(device.id)
      const extras = patch ? [dmxSummary(patch)] : []
      const template = getTemplate(project, device.templateId)
      const zone = project.zones.find((z) => z.id === device.zoneId)?.name
      return {
        deviceId: device.id,
        name: device.name,
        kind: template?.name ?? device.templateId,
        ...(device.model ? { model: device.model } : {}),
        ip: ipLabel(device.ip),
        networked: device.ports.some((p) => NETWORK_CONNECTORS.has(p.connector)),
        ...(device.hostname ? { hostname: device.hostname } : {}),
        ...(zone ? { zone } : {}),
        ...(device.note ? { note: device.note } : {}),
        lines,
        extras
      }
    })
}
