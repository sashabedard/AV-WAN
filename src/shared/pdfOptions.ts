import type { Messages } from './i18n/messages'
import { isLang, type Lang } from './i18n/lang'

export type PdfFormat = 'na' | 'iso'
export type PdfSection = 'schema' | 'appareils' | 'ports' | 'branchement' | 'vlans' | 'ip' | 'patch' | 'canaux' | 'puissance' | 'nomenclature' | 'baies' | 'baies-cables'

export interface PdfOptions {
  sections: PdfSection[]
  format: PdfFormat
  zonePages: boolean
  lang: Lang // langue des documents (PDF), choisie dans la boîte d'export
}

// Sections du PDF, dans l'ordre d'impression (spec § 11.1). Les libellés sont dans m.export.sections.
// i18n-ignore : identifiants de sections enregistrés dans les réglages et reçus par IPC, jamais affichés
export const PDF_SECTION_IDS: readonly PdfSection[] = ['schema', 'appareils', 'ports', 'branchement', 'vlans', 'ip', 'patch', 'canaux', 'puissance', 'nomenclature', 'baies', 'baies-cables']

// Les élévations avec câbles sont décochées par défaut (spec § 8.6).
export const DEFAULT_OFF_SECTIONS: readonly PdfSection[] = ['baies-cables']

export const pdfSectionLabel = (id: PdfSection, m: Messages): string => m.export.sections[id]

export function defaultPdfOptions(format: PdfFormat = 'na', lang: Lang = 'fr'): PdfOptions {
  return { sections: PDF_SECTION_IDS.filter((id) => !DEFAULT_OFF_SECTIONS.includes(id)), format, zonePages: true, lang }
}

// Options reçues par IPC : seulement des valeurs connues, dans l'ordre d'impression.
export function normalizePdfOptions(raw: unknown): PdfOptions {
  const o = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof PdfOptions, unknown>>
  const wanted = new Set<unknown>(Array.isArray(o.sections) ? o.sections : [])
  return {
    sections: PDF_SECTION_IDS.filter((id) => wanted.has(id)),
    format: o.format === 'iso' ? 'iso' : 'na',
    zonePages: o.zonePages === true,
    lang: isLang(o.lang) ? o.lang : 'fr'
  }
}
