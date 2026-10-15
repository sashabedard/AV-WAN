// src/renderer/src/reports/bom.ts
import type { LedStrip, Medium, Project, Psu } from '../model/types'
import { LED_STRIP_TYPES } from '../model/led'
import { psuCapacityW, resolvePsu } from '../model/power'
import { formatFr } from '../model/fields'
import { MediumSchema } from '../model/schema'
import { findPort } from '../model/rules'
import { getTemplate } from '../catalog'
import { MEDIUM_LABELS } from '../catalog/labels'
import { switchSummary } from '../catalog/switch'
import type { Cell, Column, DataTable } from '../../../shared/tables'
import { DASH, compareText } from './format'

export const BOM_COLUMNS: Column[] = [
  { label: 'Catégorie', width: 11 },
  { label: 'Désignation', width: 34 },
  { label: 'Détail', width: 34 },
  { label: 'Quantité', width: 10 }
]

const MEDIUM_ORDER: readonly Medium[] = MediumSchema.options
const FIBER: Partial<Record<Medium, 'multimode' | 'monomode'>> = { om3: 'multimode', om4: 'multimode', os2: 'monomode' }

function psuDetail(psu: Psu): string {
  const r = resolvePsu(psu)
  const watts = psuCapacityW(psu)
  return [r.volts !== undefined ? `${formatFr(r.volts)} V` : '', watts !== undefined ? `${formatFr(watts)} W` : ''].filter(Boolean).join(' · ')
}

function tally<K>(map: Map<string, { key: K; n: number }>, id: string, key: K): void {
  const hit = map.get(id)
  if (hit) hit.n++
  else map.set(id, { key, n: 1 })
}

// Nomenclature (spec § 11.1, section 7) : appareils par gabarit et modèle ; bandes LED par type, tension et W/m,
// longueur totale ; câbles par médium et longueur
// arrondie au mètre supérieur ; modules optiques déduits, un par cage SFP/SFP+ branchée en fibre
// (un câble DAC a ses modules intégrés). Une liaison Wi-Fi n'est pas un câble.
export function bom(project: Project): DataTable {
  const devices = new Map<string, { key: [string, string]; n: number }>()
  const strips = new Map<string, { strip: LedStrip; n: number; meters: number; known: boolean; unknown: boolean }>()
  for (const d of project.devices) {
    const t = getTemplate(project, d.templateId)
    const name = t?.name ?? d.templateId
    if (d.ledStrip) {
      const s = d.ledStrip
      const key = `${s.type}\u0000${s.volts}\u0000${s.wPerM}`
      const hit = strips.get(key) ?? { strip: s, n: 0, meters: 0, known: false, unknown: false }
      hit.n++
      if (s.lengthM === undefined) hit.unknown = true
      else {
        hit.known = true
        hit.meters += s.lengthM
      }
      strips.set(key, hit)
      continue
    }
    const detail = d.psu
      ? [d.model, psuDetail(d.psu)].filter(Boolean).join(' · ')
      : d.switch ? [d.model, switchSummary(d.switch)].filter(Boolean).join(' · ') : (d.model ?? t?.model ?? '')
    tally(devices, `${name}\u0000${detail}`, [name, detail])
  }
  const cables = new Map<string, { key: [Medium, number | undefined]; n: number }>()
  const modules = new Map<string, { key: string; n: number }>()
  for (const l of project.links) {
    if (l.medium === 'wifi') continue
    const len = l.lengthM === undefined ? undefined : Math.ceil(l.lengthM)
    tally(cables, `${l.medium}\u0000${len ?? ''}`, [l.medium, len])
    const fiber = FIBER[l.medium]
    if (!fiber) continue
    for (const end of [l.a, l.b]) {
      const c = findPort(project, end)?.port.connector
      if (c !== 'sfp' && c !== 'sfp+') continue
      const name = `Module ${c === 'sfp+' ? 'SFP+' : 'SFP'} ${fiber}`
      tally(modules, name, name)
    }
  }
  const byLength = (a: number | undefined, b: number | undefined): number => (a === b ? 0 : a === undefined ? 1 : b === undefined ? -1 : a - b)
  const rows: Cell[][] = [
    ...[...devices.values()]
      .sort((a, b) => compareText(a.key[0], b.key[0]) || compareText(a.key[1], b.key[1]))
      .map(({ key, n }) => ['Appareil', key[0], key[1] || DASH, n]),
    ...[...strips.values()]
      .sort((a, b) => compareText(LED_STRIP_TYPES[a.strip.type].label, LED_STRIP_TYPES[b.strip.type].label) || a.strip.volts - b.strip.volts || a.strip.wPerM - b.strip.wPerM)
      .map(({ strip, n, meters, known, unknown }) => [
        'Appareil',
        `Bande LED ${LED_STRIP_TYPES[strip.type].label}`,
        `${formatFr(strip.volts)} V · ${formatFr(strip.wPerM)} W/m · ${known ? `${formatFr(meters)} m au total${unknown ? ' + longueur à définir' : ''}` : 'longueur à définir'}`,
        n
      ]),
    ...[...cables.values()]
      .sort((a, b) => MEDIUM_ORDER.indexOf(a.key[0]) - MEDIUM_ORDER.indexOf(b.key[0]) || byLength(a.key[1], b.key[1]))
      .map(({ key, n }) => ['Câble', MEDIUM_LABELS[key[0]], key[1] === undefined ? 'longueur à définir' : `${key[1]} m`, n]),
    ...[...modules.values()]
      .sort((a, b) => compareText(a.key, b.key))
      .map(({ key, n }) => ['Module', key, key.endsWith('multimode') ? 'pour fibre OM3 / OM4' : 'pour fibre OS2', n])
  ]
  return { id: 'nomenclature', title: 'Nomenclature', columns: BOM_COLUMNS, rows }
}
