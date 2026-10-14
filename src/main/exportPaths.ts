import { existsSync } from 'node:fs'

export type ExportKind = 'pdf' | 'csv' | 'xlsx'

export const EXPORT_FILTERS: Record<ExportKind, { name: string; extensions: string[] }> = {
  pdf: { name: 'Document PDF', extensions: ['pdf'] },
  csv: { name: 'Fichiers CSV', extensions: ['csv'] },
  xlsx: { name: 'Classeur Excel', extensions: ['xlsx'] }
}

export function withExtension(path: string, kind: ExportKind): string {
  return path.toLowerCase().endsWith(`.${kind}`) ? path : `${path}.${kind}`
}

// Nom proposé dans le dialogue : sans caractères interdits par macOS ou Windows.
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

export function safeFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  const clean = name.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]+/g, '-').trim() || 'projet'
  // Windows refuse « CON », « nul.txt »… : le nom sans extension ne doit pas être un nom d'appareil.
  return RESERVED.test(clean.split('.')[0]!.trim()) ? `${clean}-projet` : clean
}

// Chemins déjà occupés, pour demander avant de les remplacer.
export function existingPaths(paths: string[], exists: (p: string) => boolean = existsSync): string[] {
  return paths.filter((p) => exists(p))
}

// Un fichier par liste, à côté du nom choisi : « lumen.csv » → « lumen-branchement.csv »… (décision 2).
export function csvPaths(target: string, ids: string[]): string[] {
  const stem = target.replace(/\.csv$/i, '')
  return ids.map((id) => `${stem}-${id}.csv`)
}
