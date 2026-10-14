import type { Project } from '../model/types'
import type { Column, DataTable } from '../../../shared/tables'
import { connection, sortedLinks } from './connections'

export const CABLE_COLUMNS: Column[] = [
  { label: 'Câble', width: 9 },
  { label: 'De', width: 22 },
  { label: 'Vers', width: 22 },
  { label: 'Médium', width: 11 },
  { label: 'Longueur (m)', width: 12 },
  { label: 'PoE', width: 17 },
  { label: 'Mode', width: 8 },
  { label: 'VLAN natif', width: 16 },
  { label: 'VLAN étiquetés', width: 16 },
  { label: 'Note', width: 30 }
]

// Liste de branchement globale (spec § 11.1, section 4).
export function cableSchedule(project: Project): DataTable {
  const rows = sortedLinks(project).map((link) => {
    const c = connection(project, link)
    return [c.cableId, c.fromLabel, c.toLabel, c.medium, c.lengthM ?? null, c.poeLabel, c.modeLabel, c.nativeLabel, c.taggedLabel, c.note]
  })
  return { id: 'branchement', title: 'Liste de branchement', columns: CABLE_COLUMNS, rows }
}
