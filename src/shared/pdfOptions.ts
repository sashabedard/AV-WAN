export type PdfFormat = 'na' | 'iso'
export type PdfSection = 'schema' | 'appareils' | 'ports' | 'branchement' | 'vlans' | 'ip' | 'patch' | 'nomenclature'

export interface PdfOptions {
  sections: PdfSection[]
  format: PdfFormat
  zonePages: boolean
}

// Sections du PDF, dans l'ordre d'impression (spec § 11.1).
export const PDF_SECTIONS: ReadonlyArray<{ id: PdfSection; label: string }> = [
  { id: 'schema', label: 'Schéma' },
  { id: 'appareils', label: 'Fiches par appareil' },
  { id: 'ports', label: 'Carte des ports par switch' },
  { id: 'branchement', label: 'Liste de branchement' },
  { id: 'vlans', label: 'Fiches VLAN' },
  { id: 'ip', label: 'Plan d’adressage IP' },
  { id: 'patch', label: 'Patch DMX' },
  { id: 'nomenclature', label: 'Nomenclature' }
]

export const PDF_FORMAT_LABELS: Record<PdfFormat, string> = { na: 'Tabloïd 11×17 + Lettre', iso: 'A3 + A4' }

export function defaultPdfOptions(format: PdfFormat = 'na'): PdfOptions {
  return { sections: PDF_SECTIONS.map((s) => s.id), format, zonePages: true }
}

// Options reçues par IPC : seulement des valeurs connues, dans l'ordre d'impression.
export function normalizePdfOptions(raw: unknown): PdfOptions {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof PdfOptions, unknown>>
  const wanted = new Set<unknown>(Array.isArray(o.sections) ? o.sections : [])
  return {
    sections: PDF_SECTIONS.map((s) => s.id).filter((id) => wanted.has(id)),
    format: o.format === 'iso' ? 'iso' : 'na',
    zonePages: o.zonePages === true
  }
}
