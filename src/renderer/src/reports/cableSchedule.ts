import type { Project } from '../model/types'
import type { Column, DataTable } from '../../../shared/tables'
import type { Lang } from '../../../shared/i18n/lang'
import { messages, type Messages } from '../../../shared/i18n/messages'
import { connection, sortedLinks } from './connections'

const WIDTHS = [9, 22, 22, 11, 12, 17, 8, 16, 16, 30]

export function cableColumns(m: Messages): Column[] {
  const c = m.reports.cabling
  return [c.cable, c.from, c.to, c.medium, c.length, c.poe, c.mode, c.nativeVlan, c.taggedVlans, c.note].map((label, i) => ({ label, width: WIDTHS[i]! }))
}

// Liste de branchement globale (spec § 11.1, section 4).
export function cableSchedule(project: Project, lang: Lang): DataTable {
  const m = messages(lang)
  const rows = sortedLinks(project, lang).map((link) => {
    const c = connection(project, link, lang)
    return [c.cableId, c.fromLabel, c.toLabel, c.medium, c.lengthM ?? null, c.poeLabel, c.modeLabel, c.nativeLabel, c.taggedLabel, c.note]
  })
  return { id: m.reports.files.cabling, title: m.reports.cabling.title, columns: cableColumns(m), rows }
}
