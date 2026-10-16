// src/renderer/src/reports/powerBudget.ts
// Bilan de puissance (spec patch-puissance-catalogue § 6.1) : par alimentation, par zone, au total.
// Règle anti-double-compte : un appareil nourri par une alimentation compte via elle, un appareil PoE via son switch.
import type { Device, MainsVoltage, Project } from '../model/types'
import { getTemplate } from '../catalog'
import { displayName } from '../catalog/templateText'
import { PATCH_PANEL_TEMPLATE_IDS } from '../catalog/templates'
import { devicePowerW, feedingPsu, loadLevel, mainsVoltage, poeFeeder, psuLoad, resolvePsu, round1 } from '../model/power'
import { formatters } from '../../../shared/i18n/format'
import { messages, type Messages } from '../../../shared/i18n/messages'
import type { Lang } from '../../../shared/i18n/lang'
import { LED_STRIP_TYPES } from '../model/led'
import type { Cell, Column, DataTable } from '../../../shared/tables'
import { compareText } from './format'

export function powerColumns(m: Messages): Column[] {
  const c = m.reports.power
  const widths = [14, 16, 26, 13, 16, 20, 34]
  return [c.zone, c.device, c.type, c.watts, c.fedBy, c.mains, c.remark].map((label, i) => ({ label, width: widths[i]! }))
}
export function powerPdfColumns(m: Messages): Column[] {
  const c = m.reports.power
  return [c.device, c.type, c.watts, c.fedBy, c.mains, c.remark].map((label) => ({ label }))
}
export function psuColumns(m: Messages): Column[] {
  const c = m.reports.power
  return [c.psu, c.voltage, c.capacity, c.load, c.loadPct, c.feeds, c.remark].map((label) => ({ label }))
}

export interface PowerRow {
  device: string
  type: string
  watts?: number
  fedBy: string
  mainsW?: number
  remark: string
}
export interface PowerZone {
  zone: string // nom affiché
  zoneId?: string // absent : hors zone
  rows: PowerRow[]
  subtotalW: number
}
export interface PsuSummary {
  name: string
  volts?: number
  capacityW?: number
  loadW: number
  ratio?: number
  fed: string[]
  remark: string
}
export interface PowerBudget {
  psus: PsuSummary[]
  zones: PowerZone[]
  totalW: number
  amps: number
  voltage: MainsVoltage
  missing: string[]
}

const levelText = (m: Messages): Record<ReturnType<typeof loadLevel>, string> => ({ ok: '', margin: m.reports.power.margin, over: m.reports.power.over })

function psuRemark(project: Project, psu: Device, lang: Lang): string {
  const m = messages(lang)
  const fmt = formatters(lang)
  const load = psuLoad(project, psu.id)
  if (load.capacityW === undefined) return m.reports.power.loadUnknownCapacity({ load: fmt.num(load.loadW) })
  const level = levelText(m)[loadLevel(load.ratio ?? 0)]
  return [m.reports.power.loadWithCapacity({ load: fmt.num(load.loadW), capacity: fmt.num(load.capacityW), pct: Math.round((load.ratio ?? 0) * 100) }), ...(level ? [level] : [])].join(' · ')
}

export function powerBudget(project: Project, lang: Lang): PowerBudget {
  const m = messages(lang)
  const text = m.reports.power
  // Par id de zone (undefined : hors zone) : deux zones homonymes, ou une zone nommée « Hors zone », ne fusionnent pas.
  const byZone = new Map<string | undefined, PowerRow[]>()
  const missing: string[] = []
  for (const d of [...project.devices].sort((a, b) => compareText(a.name, b.name, lang))) {
    const watts = devicePowerW(d)
    const psu = feedingPsu(project, d.id)
    const poe = psu ? undefined : poeFeeder(project, d.id)
    // Alimentation sans capacité : elle compte au secteur sa charge connue (borne basse), sinon ses appareils disparaîtraient du total.
    const unratedLoadW = d.psu && watts === undefined ? psuLoad(project, d.id).loadW : undefined
    if (watts === undefined && !psu && unratedLoadW === undefined) {
      if (!poe && !PATCH_PANEL_TEMPLATE_IDS.has(d.templateId)) missing.push(d.name) // un panneau de brassage ne consomme rien
      continue
    }
    const mainsW = psu || poe ? undefined : (watts ?? unratedLoadW)
    const t = getTemplate(project, d.templateId)
    const remark = d.psu ? psuRemark(project, d, lang) : poe ? text.viaPoe({ name: poe.name }) : psu && watts === undefined ? text.noPower : ''
    const row: PowerRow = {
      device: d.name,
      type: d.model ?? (d.ledStrip ? m.reports.common.ledStrip({ type: LED_STRIP_TYPES[d.ledStrip.type].label }) : (t?.model ?? (t ? displayName(t, lang) : ''))),
      ...(watts !== undefined ? { watts } : {}),
      fedBy: psu?.name ?? poe?.name ?? '',
      ...(mainsW !== undefined ? { mainsW } : {}),
      remark
    }
    const zoneId = project.zones.find((z) => z.id === d.zoneId)?.id
    byZone.set(zoneId, [...(byZone.get(zoneId) ?? []), row])
  }
  const order: Array<{ id?: string; name: string }> = [...project.zones, { name: text.noZone }]
  const zones: PowerZone[] = order
    .filter(({ id }, i) => byZone.has(id) && order.findIndex((z) => z.id === id) === i)
    .map(({ id, name }) => {
      const rows = byZone.get(id)!
      return { zone: name, ...(id !== undefined ? { zoneId: id } : {}), rows, subtotalW: round1(rows.reduce((sum, r) => sum + (r.mainsW ?? 0), 0)) }
    })
  const totalW = round1(zones.reduce((sum, z) => sum + z.subtotalW, 0))
  const voltage = mainsVoltage(project)
  const psus: PsuSummary[] = project.devices
    .filter((d) => d.psu)
    .sort((a, b) => compareText(a.name, b.name, lang))
    .map((d) => {
      const load = psuLoad(project, d.id)
      const r = resolvePsu(d.psu)
      const level = load.ratio !== undefined ? levelText(m)[loadLevel(load.ratio)] : text.capacityUnknown
      return {
        name: d.name,
        ...(r.volts !== undefined ? { volts: r.volts } : {}),
        ...(load.capacityW !== undefined ? { capacityW: load.capacityW } : {}),
        loadW: load.loadW,
        ...(load.ratio !== undefined ? { ratio: load.ratio } : {}),
        fed: load.fed.map((x) => x.name),
        remark: level
      }
    })
  return { psus, zones, totalW, amps: round1(totalW / voltage), voltage, missing }
}

const num = (n: number | undefined): Cell => (n === undefined ? null : n)

export function powerTable(project: Project, lang: Lang): DataTable {
  const m = messages(lang)
  const text = m.reports.power
  const b = powerBudget(project, lang)
  const rows: Cell[][] = []
  for (const z of b.zones) {
    for (const r of z.rows) rows.push([z.zone, r.device, r.type, num(r.watts), r.fedBy, num(r.mainsW), r.remark])
    rows.push([z.zone, text.subtotal, '', null, '', z.subtotalW, ''])
  }
  rows.push(['', text.total, '', null, '', b.totalW, text.totalAmps({ amps: formatters(lang).num(b.amps, 1), voltage: b.voltage })])
  if (b.missing.length > 0) rows.push(['', text.missing, '', null, '', null, b.missing.join(', ')])
  return { id: m.reports.files.power, title: text.title, columns: powerColumns(m), rows }
}
