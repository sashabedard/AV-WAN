// src/renderer/src/reports/patch.ts
import type { Project } from '../model/types'
import { getTemplate } from '../catalog'
import { displayName } from '../catalog/templateText'
import { modeLabel } from '../catalog/modeLabels'
import { LED_STRIP_TYPES } from '../model/led'
import { issueTexts, overlapsIn, patchIndex, patchIssues, rangeLabel, sourceLabel, sourceText, TYPED_SOURCE, type PatchEntry } from '../model/dmx'
import type { Cell, Column, DataTable } from '../../../shared/tables'
import { compareText } from './format'
import { messages, type Messages } from '../../../shared/i18n/messages'
import type { Lang } from '../../../shared/i18n/lang'

export function patchColumns(m: Messages): Column[] {
  const c = m.reports.patch
  const widths = [9, 9, 7, 8, 16, 26, 20, 18, 14, 30]
  return [c.universe, c.address, c.end, c.channels, c.device, c.model, c.mode, c.source, c.zone, c.remark].map((label, i) => ({ label, width: widths[i]! }))
}
export function patchPdfColumns(m: Messages): Column[] {
  const c = m.reports.patch
  return [c.address, c.end, c.channels, c.device, c.model, c.mode, c.zone, c.remark].map((label) => ({ label }))
}

export interface PatchRow {
  universe?: number
  address?: number
  end?: number
  channels: number
  device: string
  model: string
  mode: string
  source: string
  zone: string
  remark: string
}
export interface PatchGroup {
  universe?: number
  title: string
  rows: PatchRow[]
}

const zoneName = (project: Project, id: string | undefined): string => project.zones.find((z) => z.id === id)?.name ?? ''
const undefinedLast = (a: number | undefined, b: number | undefined): number => (a === b ? 0 : a === undefined ? 1 : b === undefined ? -1 : a - b)

// Une ligne par appareil patchable (spec § 6.1) ; la partie B y ajoute les bandes pixel.
export function patchRows(project: Project, lang: Lang): PatchRow[] {
  const m = messages(lang)
  const index = patchIndex(project)
  const rows: PatchRow[] = []
  for (const entry of index.entries.values()) {
    const d = entry.device
    const dmx = d.dmx!
    const t = getTemplate(project, d.templateId)
    rows.push({
      ...(entry.universe ? { universe: entry.universe.universe } : {}),
      ...(dmx.address !== undefined ? { address: dmx.address, end: dmx.address + dmx.footprint - 1 } : {}),
      channels: dmx.footprint,
      device: d.name,
      model: d.model ?? t?.model ?? (t ? displayName(t, lang) : ''),
      mode: dmx.mode ? modeLabel(dmx.mode, lang) : '',
      source: entry.universe ? sourceLabel(project, entry.universe.source, m) : '',
      zone: zoneName(project, d.zoneId),
      remark: issueTexts(patchIssues(index, d.id), m).join(' · ')
    })
  }
  for (const sp of index.strips.values()) {
    const d = sp.device
    const t = getTemplate(project, d.templateId)
    const label = LED_STRIP_TYPES[d.ledStrip!.type].label
    for (const span of sp.spans) {
      rows.push({
        universe: span.universe,
        address: 1,
        end: span.channels,
        channels: span.channels,
        device: d.name,
        model: d.model ?? t?.model ?? (t ? displayName(t, lang) : ''),
        mode: `${label} · ${span.pixels} px`,
        source: sourceLabel(project, { kind: 'port', ref: sp.source }, m),
        zone: zoneName(project, d.zoneId),
        remark: issueTexts({ overlaps: overlapsIn(index, span.universe, 1, span.channels, d.id), overflow: false }, m).join(' · ')
      })
    }
  }
  return rows.sort((a, b) => undefinedLast(a.universe, b.universe) || undefinedLast(a.address, b.address) || compareText(a.device, b.device, lang))
}

// Un bloc par univers ; l'en-tête nomme la ou les sorties qui le portent (la source « typed », univers tapé, n'en est pas une).
export function patchGroups(project: Project, lang: Lang): PatchGroup[] {
  const c = messages(lang).reports.patch
  const groups: PatchGroup[] = []
  for (const row of patchRows(project, lang)) {
    let g = groups.at(-1)
    if (!g || g.universe !== row.universe) {
      g = { ...(row.universe !== undefined ? { universe: row.universe } : {}), title: '', rows: [] }
      groups.push(g)
    }
    g.rows.push(row)
  }
  for (const g of groups) {
    const sources = [...new Set(g.rows.map((r) => r.source).filter((s) => s && s !== TYPED_SOURCE))]
    g.title = g.universe === undefined ? c.noUniverse : `${c.groupTitle({ n: g.universe })}${sources.length > 0 ? ` · ${sources.join(', ')}` : ''}`
  }
  return groups
}

const num = (n: number | undefined): Cell => (n === undefined ? null : n)

export function patchTable(project: Project, lang: Lang): DataTable {
  const m = messages(lang)
  const rows = patchRows(project, lang).map((r): Cell[] => [num(r.universe), num(r.address), num(r.end), r.channels, r.device, r.model, r.mode, sourceText(r.source, m), r.zone, r.remark])
  return { id: m.reports.files.patch, title: m.reports.patch.title, columns: patchColumns(m), rows }
}

// « DMX : U2 · 33–48 · 16 ch · Standard 16 ch » (fiches par appareil, § 6.3).
export function dmxSummary(entry: PatchEntry, lang: Lang): string {
  const c = messages(lang).reports.patch
  const dmx = entry.device.dmx!
  const universe = entry.universe ? `U${entry.universe.universe}` : c.unknownUniverse
  const range = dmx.address !== undefined ? rangeLabel(dmx.address, dmx.address + dmx.footprint - 1) : c.addressTbd
  return [c.summaryHead({ universe }), range, `${dmx.footprint} ${c.channelsShort}`, ...(dmx.mode ? [modeLabel(dmx.mode, lang)] : [])].join(' · ')
}
