// src/renderer/src/reports/powerBudget.ts
// Bilan de puissance (spec patch-puissance-catalogue § 6.1) : par alimentation, par zone, au total.
// Règle anti-double-compte : un appareil nourri par une alimentation compte via elle, un appareil PoE via son switch.
import type { Device, MainsVoltage, Project } from '../model/types'
import { getTemplate } from '../catalog'
import { devicePowerW, feedingPsu, loadLevel, mainsVoltage, poeFeeder, psuLoad, resolvePsu, round1 } from '../model/power'
import { formatFr } from '../model/fields'
import type { Cell, Column, DataTable } from '../../../shared/tables'
import { compareText } from './format'

export const POWER_COLUMNS: Column[] = [
  { label: 'Zone', width: 14 },
  { label: 'Appareil', width: 16 },
  { label: 'Type', width: 26 },
  { label: 'Puissance (W)', width: 13 },
  { label: 'Alimenté par', width: 16 },
  { label: 'Compté au secteur (W)', width: 20 },
  { label: 'Remarque', width: 34 }
]
export const POWER_PDF_COLUMNS: Column[] = ['Appareil', 'Type', 'Puissance (W)', 'Alimenté par', 'Compté au secteur (W)', 'Remarque'].map((label) => ({ label }))
export const PSU_COLUMNS: Column[] = ['Alimentation', 'Tension', 'Capacité (W)', 'Charge (W)', 'Charge', 'Alimente', 'Remarque'].map((label) => ({ label }))

export interface PowerRow {
  device: string
  type: string
  watts?: number
  fedBy: string
  mainsW?: number
  remark: string
}
export interface PowerZone {
  zone: string
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

const LEVEL_TEXT = { ok: '', margin: 'Marge de 20 % dépassée', over: 'Surcharge' } as const
const HORS_ZONE = 'Hors zone'

function psuRemark(project: Project, psu: Device): string {
  const load = psuLoad(project, psu.id)
  if (load.capacityW === undefined) return `charge ${formatFr(load.loadW)} W, capacité inconnue`
  const level = LEVEL_TEXT[loadLevel(load.ratio ?? 0)]
  return [`charge ${formatFr(load.loadW)} W / ${formatFr(load.capacityW)} W (${Math.round((load.ratio ?? 0) * 100)} %)`, ...(level ? [level] : [])].join(' · ')
}

export function powerBudget(project: Project): PowerBudget {
  const byZone = new Map<string, PowerRow[]>()
  const missing: string[] = []
  for (const d of [...project.devices].sort((a, b) => compareText(a.name, b.name))) {
    const watts = devicePowerW(d)
    const psu = feedingPsu(project, d.id)
    const poe = psu ? undefined : poeFeeder(project, d.id)
    if (watts === undefined && !psu) {
      if (!poe) missing.push(d.name)
      continue
    }
    const t = getTemplate(project, d.templateId)
    const remark = d.psu ? psuRemark(project, d) : poe ? `via PoE · ${poe.name}` : psu && watts === undefined ? 'puissance non renseignée' : ''
    const row: PowerRow = {
      device: d.name,
      type: d.model ?? t?.model ?? t?.name ?? '',
      ...(watts !== undefined ? { watts } : {}),
      fedBy: psu?.name ?? poe?.name ?? '',
      ...(!psu && !poe && watts !== undefined ? { mainsW: watts } : {}),
      remark
    }
    const zone = project.zones.find((z) => z.id === d.zoneId)?.name ?? HORS_ZONE
    byZone.set(zone, [...(byZone.get(zone) ?? []), row])
  }
  const order = [...project.zones.map((z) => z.name), HORS_ZONE]
  const zones: PowerZone[] = order
    .filter((name, i) => byZone.has(name) && order.indexOf(name) === i)
    .map((zone) => {
      const rows = byZone.get(zone)!
      return { zone, rows, subtotalW: round1(rows.reduce((sum, r) => sum + (r.mainsW ?? 0), 0)) }
    })
  const totalW = round1(zones.reduce((sum, z) => sum + z.subtotalW, 0))
  const voltage = mainsVoltage(project)
  const psus: PsuSummary[] = project.devices
    .filter((d) => d.psu)
    .sort((a, b) => compareText(a.name, b.name))
    .map((d) => {
      const load = psuLoad(project, d.id)
      const r = resolvePsu(d.psu)
      const level = load.ratio !== undefined ? LEVEL_TEXT[loadLevel(load.ratio)] : 'capacité inconnue'
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

export function powerTable(project: Project): DataTable {
  const b = powerBudget(project)
  const rows: Cell[][] = []
  for (const z of b.zones) {
    for (const r of z.rows) rows.push([z.zone, r.device, r.type, num(r.watts), r.fedBy, num(r.mainsW), r.remark])
    rows.push([z.zone, 'Sous-total', '', null, '', z.subtotalW, ''])
  }
  rows.push(['', 'Total', '', null, '', b.totalW, `${formatFr(b.amps, 1)} A à ${b.voltage} V`])
  if (b.missing.length > 0) rows.push(['', 'Sans puissance renseignée', '', null, '', null, b.missing.join(', ')])
  return { id: 'bilan-puissance', title: 'Bilan de puissance', columns: POWER_COLUMNS, rows }
}
