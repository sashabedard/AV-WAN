// src/renderer/src/reports/patch.ts
import type { Project } from '../model/types'
import { getTemplate } from '../catalog'
import { displayName } from '../catalog/templateText'
import { LED_STRIP_TYPES } from '../model/led'
import { issueTexts, overlapsIn, patchIndex, patchIssues, rangeLabel, sourceLabel, type PatchEntry } from '../model/dmx'
import type { Cell, Column, DataTable } from '../../../shared/tables'
import { compareText } from './format'

export const PATCH_COLUMNS: Column[] = [
  { label: 'Univers', width: 9 },
  { label: 'Adresse', width: 9 },
  { label: 'Fin', width: 7 },
  { label: 'Canaux', width: 8 },
  { label: 'Appareil', width: 16 },
  { label: 'Modèle', width: 26 },
  { label: 'Mode', width: 20 },
  { label: 'Source', width: 18 },
  { label: 'Zone', width: 14 },
  { label: 'Remarque', width: 30 }
]
export const PATCH_PDF_COLUMNS: Column[] = ['Adresse', 'Fin', 'Canaux', 'Appareil', 'Modèle', 'Mode', 'Zone', 'Remarque'].map((label) => ({ label }))

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
export function patchRows(project: Project): PatchRow[] {
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
      model: d.model ?? t?.model ?? (t ? displayName(t, 'fr') : '') /* plan 6 : langue des documents à la Task 12 */,
      mode: dmx.mode ?? '',
      source: entry.universe ? sourceLabel(project, entry.universe.source) : '',
      zone: zoneName(project, d.zoneId),
      remark: issueTexts(patchIssues(index, d.id)).join(' · ')
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
        model: d.model ?? t?.model ?? (t ? displayName(t, 'fr') : '') /* plan 6 : langue des documents à la Task 12 */,
        mode: `${label} · ${span.pixels} px`,
        source: sourceLabel(project, { kind: 'port', ref: sp.source }),
        zone: zoneName(project, d.zoneId),
        remark: issueTexts({ overlaps: overlapsIn(index, span.universe, 1, span.channels, d.id), overflow: false }).join(' · ')
      })
    }
  }
  return rows.sort((a, b) => undefinedLast(a.universe, b.universe) || undefinedLast(a.address, b.address) || compareText(a.device, b.device))
}

// Un bloc par univers ; l'en-tête nomme la ou les sorties qui le portent (« tapé » n'en est pas une).
export function patchGroups(project: Project): PatchGroup[] {
  const groups: PatchGroup[] = []
  for (const row of patchRows(project)) {
    let g = groups.at(-1)
    if (!g || g.universe !== row.universe) {
      g = { ...(row.universe !== undefined ? { universe: row.universe } : {}), title: '', rows: [] }
      groups.push(g)
    }
    g.rows.push(row)
  }
  for (const g of groups) {
    const sources = [...new Set(g.rows.map((r) => r.source).filter((s) => s && s !== 'tapé'))]
    g.title = g.universe === undefined ? 'Sans univers' : `Univers ${g.universe}${sources.length > 0 ? ` · ${sources.join(', ')}` : ''}`
  }
  return groups
}

const num = (n: number | undefined): Cell => (n === undefined ? null : n)

export function patchTable(project: Project): DataTable {
  const rows = patchRows(project).map((r): Cell[] => [num(r.universe), num(r.address), num(r.end), r.channels, r.device, r.model, r.mode, r.source, r.zone, r.remark])
  return { id: 'patch-dmx', title: 'Patch DMX', columns: PATCH_COLUMNS, rows }
}

// « DMX : U2 · 33–48 · 16 ch · Standard 16 ch » (fiches par appareil, § 6.3).
export function dmxSummary(entry: PatchEntry): string {
  const dmx = entry.device.dmx!
  const universe = entry.universe ? `U${entry.universe.universe}` : 'univers inconnu'
  const range = dmx.address !== undefined ? rangeLabel(dmx.address, dmx.address + dmx.footprint - 1) : 'adresse à définir'
  return [`DMX : ${universe}`, range, `${dmx.footprint} ch`, ...(dmx.mode ? [dmx.mode] : [])].join(' · ')
}
