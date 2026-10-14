// src/renderer/src/reports/bom.ts
import type { Medium, Project } from '../model/types'
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

function tally<K>(map: Map<string, { key: K; n: number }>, id: string, key: K): void {
  const hit = map.get(id)
  if (hit) hit.n++
  else map.set(id, { key, n: 1 })
}

// Nomenclature (spec § 11.1, section 7) : appareils par gabarit et modèle ; câbles par médium et longueur
// arrondie au mètre supérieur ; modules optiques déduits, un par cage SFP/SFP+ branchée en fibre
// (un câble DAC a ses modules intégrés). Une liaison Wi-Fi n'est pas un câble.
export function bom(project: Project): DataTable {
  const devices = new Map<string, { key: [string, string]; n: number }>()
  for (const d of project.devices) {
    const t = getTemplate(project, d.templateId)
    const name = t?.name ?? d.templateId
    const detail = d.switch ? [d.model, switchSummary(d.switch)].filter(Boolean).join(' · ') : (d.model ?? t?.model ?? '')
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
    ...[...cables.values()]
      .sort((a, b) => MEDIUM_ORDER.indexOf(a.key[0]) - MEDIUM_ORDER.indexOf(b.key[0]) || byLength(a.key[1], b.key[1]))
      .map(({ key, n }) => ['Câble', MEDIUM_LABELS[key[0]], key[1] === undefined ? 'longueur à définir' : `${key[1]} m`, n]),
    ...[...modules.values()]
      .sort((a, b) => compareText(a.key, b.key))
      .map(({ key, n }) => ['Module', key, key.endsWith('multimode') ? 'pour fibre OM3 / OM4' : 'pour fibre OS2', n])
  ]
  return { id: 'nomenclature', title: 'Nomenclature', columns: BOM_COLUMNS, rows }
}
