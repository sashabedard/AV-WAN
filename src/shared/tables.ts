import type { Lang } from './i18n/lang'

// Tableau de données commun au PDF, au CSV et au classeur Excel : une seule source pour les trois.
export type Cell = string | number | null

export interface Column {
  label: string
  width?: number // largeur en caractères (classeur Excel)
}

export interface DataTable {
  id: string // suffixe des fichiers CSV (m.reports.files : « branchement » / « cabling »…)
  title: string // titre de page dans le PDF, nom de feuille dans le classeur
  columns: Column[]
  rows: Cell[][]
}

// Texte qu'Excel prendrait pour une formule (injection CSV) : préfixé d'une apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/

// CSV pour Excel : en français « ; » et virgule décimale ; en anglais « , » et point. UTF-8 avec BOM, CRLF.
const CSV: Record<Lang, { sep: string; decimal: string }> = { fr: { sep: ';', decimal: ',' }, en: { sep: ',', decimal: '.' } }

function csvCell(c: Cell, lang: Lang): string {
  const { sep, decimal } = CSV[lang]
  if (c === null) return ''
  const text = typeof c === 'number' ? String(c).replace('.', decimal) : FORMULA_START.test(c) ? `'${c}` : c
  return text.includes(sep) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(table: DataTable, lang: Lang): string {
  const lines = [table.columns.map((c) => csvCell(c.label, lang)), ...table.rows.map((r) => r.map((c) => csvCell(c, lang)))].map((cells) => cells.join(CSV[lang].sep))
  return `\uFEFF${lines.join('\r\n')}\r\n`
}

const SAFE_ID = /^[a-z0-9-]{1,40}$/

// Ce que le processus principal accepte d'écrire : la forme exacte d'un DataTable, et un identifiant
// sûr dans un nom de fichier (ni « / » ni « .. »).
export function isDataTables(x: unknown): x is DataTable[] {
  const isCell = (c: unknown): boolean => c === null || typeof c === 'string' || typeof c === 'number'
  return (
    Array.isArray(x) &&
    x.every(
      (t) =>
        typeof t === 'object' &&
        t !== null &&
        typeof t.id === 'string' &&
        SAFE_ID.test(t.id) &&
        typeof t.title === 'string' &&
        Array.isArray(t.columns) &&
        t.columns.every((c: unknown) => typeof c === 'object' && c !== null && typeof (c as { label?: unknown }).label === 'string') &&
        Array.isArray(t.rows) &&
        t.rows.every((r: unknown) => Array.isArray(r) && r.every(isCell))
    )
  )
}
