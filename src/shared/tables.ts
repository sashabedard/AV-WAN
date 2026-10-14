// Tableau de données commun au PDF, au CSV et au classeur Excel : une seule source pour les trois.
export type Cell = string | number | null

export interface Column {
  label: string
  width?: number // largeur en caractères (classeur Excel)
}

export interface DataTable {
  id: string // suffixe des fichiers CSV : « branchement », « plan-ip », « nomenclature »
  title: string // titre de page dans le PDF, nom de feuille dans le classeur
  columns: Column[]
  rows: Cell[][]
}

// Texte qu'Excel prendrait pour une formule (injection CSV) : préfixé d'une apostrophe.
const FORMULA_START = /^[=+\-@\t\r]/

function csvCell(c: Cell): string {
  if (c === null) return ''
  const text = typeof c === 'number' ? String(c).replace('.', ',') : FORMULA_START.test(c) ? `'${c}` : c
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// CSV pour Excel en français : séparateur « ; », virgule décimale, UTF-8 avec BOM, fins de ligne CRLF.
export function toCsv(table: DataTable): string {
  const lines = [table.columns.map((c) => csvCell(c.label)), ...table.rows.map((r) => r.map(csvCell))].map((cells) => cells.join(';'))
  return `﻿${lines.join('\r\n')}\r\n`
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
