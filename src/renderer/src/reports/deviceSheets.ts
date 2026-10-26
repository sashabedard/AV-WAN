import type { Device, LedStrip, Project } from '../model/types'
import { primaryIp } from '../model/ips'
import { LED_STRIP_TYPES, stripPixels, stripPower } from '../model/led'
import { psuLoad, resolvePsu } from '../model/power'
import { formatters } from '../../../shared/i18n/format'
import { messages } from '../../../shared/i18n/messages'
import type { Lang } from '../../../shared/i18n/lang'
import { linksOnPort, portDisplayLabel } from '../model/rules'
import { displayName } from '../catalog/templateText'
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
export function sheetLineText(port: string, c: Connection, lang: Lang): string {
  const parts = [`${port} › ${c.toLabel}`]
  if (c.poe.active) parts.push(c.poeLabel)
  if (c.vlan.kind === 'access') parts.push(`VLAN ${c.nativeLabel}`)
  if (c.vlan.kind === 'trunk') parts.push(messages(lang).reports.deviceSheet.trunk({ native: c.nativeLabel !== DASH ? c.nativeLabel : '', tagged: c.taggedLabel }))
  parts.push([c.cableId, c.medium, ...(c.lengthM !== undefined ? [c.lengthLabel] : [])].join(' '))
  if (c.note) parts.push(c.note)
  return parts.join(' · ')
}

// « COB mono · 24 V · 10 W/m · 5 m · 50 W » (spec § 6.3).
export function stripLine(strip: LedStrip, lang: Lang): string {
  const fmt = formatters(lang)
  const info = LED_STRIP_TYPES[strip.type]
  const power = stripPower(strip)
  const head = [info.label, `${fmt.num(strip.volts)} V`, `${fmt.num(strip.wPerM)} W/m`]
  return [...head, ...(power && strip.lengthM !== undefined ? [`${fmt.num(strip.lengthM)} m`, `${fmt.num(power.watts)} W`] : [messages(lang).reports.common.lengthTbd])].join(' · ')
}

function powerExtras(project: Project, device: Device, lang: Lang): string[] {
  const fmt = formatters(lang)
  const text = messages(lang).reports.deviceSheet
  if (device.ledStrip) {
    const px = stripPixels(device.ledStrip)
    return [stripLine(device.ledStrip, lang), ...(px ? [text.stripPixels({ pixels: fmt.num(px.pixels), universes: px.universes })] : [])]
  }
  if (device.psu) {
    const r = resolvePsu(device.psu)
    const load = psuLoad(project, device.id)
    const volts = r.volts !== undefined ? `${fmt.num(r.volts)} V` : ''
    return [
      load.capacityW !== undefined
        ? text.psuCapacity({ volts, capacity: fmt.num(load.capacityW), load: fmt.num(load.loadW), pct: Math.round((load.ratio ?? 0) * 100) })
        : text.psuUnknown({ volts, load: fmt.num(load.loadW) })
    ]
  }
  return device.powerW !== undefined ? [text.power({ watts: fmt.num(device.powerW) })] : []
}

// Fiches des appareils qui ne sont pas des switchs (spec § 11.1, section 2), triées par nom.
export function deviceSheets(project: Project, lang: Lang): DeviceSheet[] {
  const index = patchIndex(project)
  return project.devices
    .filter((d) => d.switch === undefined)
    .sort((a, b) => compareText(a.name, b.name, lang))
    .map((device) => {
      const lines = device.ports.flatMap((port) => {
        const ref = { deviceId: device.id, portId: port.id }
        return linksOnPort(project, ref)
          .sort((x, y) => compareText(x.cableId, y.cableId, lang))
          .map((l) => {
            const c = connection(project, l, lang, ref)
            const label = portDisplayLabel(device, port, messages(lang))
            return { port: label, connection: c, text: sheetLineText(label, c, lang) }
          })
      })
      const patch = index.entries.get(device.id)
      const extras = [...(patch ? [dmxSummary(patch, lang)] : []), ...powerExtras(project, device, lang)]
      const template = getTemplate(project, device.templateId)
      const zone = project.zones.find((z) => z.id === device.zoneId)?.name
      return {
        deviceId: device.id,
        name: device.name,
        kind: template ? displayName(template, lang) : device.templateId,
        ...(device.model ? { model: device.model } : {}),
        ip: ipLabel(primaryIp(device), lang),
        networked: device.ports.some((p) => NETWORK_CONNECTORS.has(p.connector)),
        ...(device.hostname ? { hostname: device.hostname } : {}),
        ...(zone ? { zone } : {}),
        ...(device.note ? { note: device.note } : {}),
        lines,
        extras
      }
    })
}
