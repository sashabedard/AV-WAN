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
export function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'projet'
}
