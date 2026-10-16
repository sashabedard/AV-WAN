// src/renderer/src/reports/bom.ts
import type { LedStrip, Medium, Project, Psu } from '../model/types'
import { LED_STRIP_TYPES } from '../model/led'
import { psuCapacityW, resolvePsu } from '../model/power'
import { formatters } from '../../../shared/i18n/format'
import type { Lang } from '../../../shared/i18n/lang'
import { MediumSchema } from '../model/schema'
import { findPort } from '../model/rules'
import { getTemplate } from '../catalog'
import { mediumLabel } from '../catalog/labels'
import { displayName } from '../catalog/templateText'
import { messages, type Messages } from '../../../shared/i18n/messages'
import { switchSummary } from '../catalog/switch'
import type { Cell, Column, DataTable } from '../../../shared/tables'
import { DASH, compareText } from './format'

export function bomColumns(m: Messages): Column[] {
  const c = m.reports.bom
  const widths = [11, 34, 34, 10]
  return [c.category, c.item, c.detail, c.quantity].map((label, i) => ({ label, width: widths[i]! }))
}

const MEDIUM_ORDER: readonly Medium[] = MediumSchema.options
const FIBER: Partial<Record<Medium, 'multimode' | 'monomode'>> = { om3: 'multimode', om4: 'multimode', os2: 'monomode' }

function psuDetail(psu: Psu, lang: Lang): string {
  const fmt = formatters(lang)
  const r = resolvePsu(psu)
  const watts = psuCapacityW(psu)
  return [r.volts !== undefined ? `${fmt.num(r.volts)} V` : '', watts !== undefined ? `${fmt.num(watts)} W` : ''].filter(Boolean).join(' · ')
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
export function bom(project: Project, lang: Lang): DataTable {
  const m = messages(lang)
  const text = m.reports.bom
  const fmt = formatters(lang)
  const devices = new Map<string, { key: [string, string]; n: number }>()
  const strips = new Map<string, { strip: LedStrip; n: number; meters: number; known: boolean; unknown: boolean }>()
  for (const d of project.devices) {
    const t = getTemplate(project, d.templateId)
    const name = t ? displayName(t, lang) : d.templateId
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
      ? [d.model, psuDetail(d.psu, lang)].filter(Boolean).join(' · ')
      : d.switch ? [d.model, switchSummary(d.switch, m)].filter(Boolean).join(' · ') : (d.model ?? t?.model ?? '')
    tally(devices, `${name}\u0000${detail}`, [name, detail])
  }
  const cables = new Map<string, { key: [Medium, number | undefined]; n: number }>()
  const modules = new Map<string, { key: string; fiber: 'multimode' | 'monomode'; n: number }>()
  for (const l of project.links) {
    if (l.medium === 'wifi') continue
    const len = l.lengthM === undefined ? undefined : Math.ceil(l.lengthM)
    tally(cables, `${l.medium}\u0000${len ?? ''}`, [l.medium, len])
    const fiber = FIBER[l.medium]
    if (!fiber) continue
    for (const end of [l.a, l.b]) {
      const c = findPort(project, end)?.port.connector
      if (c !== 'sfp' && c !== 'sfp+') continue
      const name = text.opticalModule({ cage: c === 'sfp+' ? 'SFP+' : 'SFP', fiber })
      const hit = modules.get(name)
      if (hit) hit.n++
      else modules.set(name, { key: name, fiber, n: 1 })
    }
  }
  const byLength = (a: number | undefined, b: number | undefined): number => (a === b ? 0 : a === undefined ? 1 : b === undefined ? -1 : a - b)
  const rows: Cell[][] = [
    ...[...devices.values()]
      .sort((a, b) => compareText(a.key[0], b.key[0], lang) || compareText(a.key[1], b.key[1], lang))
      .map(({ key, n }) => [text.device, key[0], key[1] || DASH, n]),
    ...[...strips.values()]
      .sort((a, b) => compareText(LED_STRIP_TYPES[a.strip.type].label, LED_STRIP_TYPES[b.strip.type].label, lang) || a.strip.volts - b.strip.volts || a.strip.wPerM - b.strip.wPerM)
      .map(({ strip, n, meters, known, unknown }) => [
        text.device,
        m.reports.common.ledStrip({ type: LED_STRIP_TYPES[strip.type].label }),
        `${fmt.num(strip.volts)} V · ${fmt.num(strip.wPerM)} W/m · ${known ? `${text.stripTotal({ meters: fmt.num(meters) })}${unknown ? text.stripPlusTbd : ''}` : m.reports.common.lengthTbd}`,
        n
      ]),
    ...[...cables.values()]
      .sort((a, b) => MEDIUM_ORDER.indexOf(a.key[0]) - MEDIUM_ORDER.indexOf(b.key[0]) || byLength(a.key[1], b.key[1]))
      .map(({ key, n }) => [text.cable, mediumLabel(key[0], m), key[1] === undefined ? m.reports.common.lengthTbd : `${key[1]} m`, n]),
    ...[...modules.values()]
      .sort((a, b) => compareText(a.key, b.key, lang))
      .map(({ key, fiber, n }) => [text.module, key, fiber === 'multimode' ? text.forMultimode : text.forSinglemode, n])
  ]
  return { id: m.reports.files.bom, title: text.title, columns: bomColumns(m), rows }
}
