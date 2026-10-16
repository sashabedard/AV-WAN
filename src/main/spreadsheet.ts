import ExcelJS from 'exceljs'
import type { DataTable } from '../shared/tables'
import type { Lang } from '../shared/i18n/lang'

const FALLBACK_SHEET: Record<Lang, string> = { fr: 'Feuille', en: 'Sheet' }

// Nom de feuille Excel : sans : \ / ? * [ ], et 31 caractères au plus.
export function sheetName(title: string, lang: Lang): string {
  return title.replace(/[:\\/?*[\]]/g, '-').slice(0, 31) || FALLBACK_SHEET[lang]
}

// Classeur : une feuille par liste, en-têtes en gras et figés, filtres activés (spec § 11.2).
export async function buildXlsx(tables: DataTable[], lang: Lang): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'AV·WAN'
  for (const t of tables) {
    const ws = wb.addWorksheet(sheetName(t.title, lang), { views: [{ state: 'frozen', ySplit: 1 }] })
    ws.columns = t.columns.map((c) => ({ header: c.label, width: c.width ?? 14 }))
    ws.addRows(t.rows)
    ws.getRow(1).font = { bold: true }
    if (t.columns.length > 0) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: t.columns.length } }
  }
  return Buffer.from(await wb.xlsx.writeBuffer())
}
