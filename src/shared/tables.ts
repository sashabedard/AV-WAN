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
