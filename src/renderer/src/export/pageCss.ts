import type { Project } from '../model/types'
import type { PdfFormat } from '../../../shared/pdfOptions'
import { STATUS_LABELS } from '../reports/format'

// Formats du PDF (spec § 11.1) : schéma en paysage, le reste en portrait. Marges de 0,4 po (10 mm),
// 0,6 po (15 mm) en bas pour le pied de page. `drawing` : la zone utile d'une page de schéma.
export const PAGE_FORMATS: Record<PdfFormat, { diagram: string; sheet: string; margin: string; drawingW: string; drawingH: string }> = {
  na: { diagram: '17in 11in', sheet: '8.5in 11in', margin: '0.4in 0.4in 0.6in', drawingW: '16.2in', drawingH: '10in' },
  iso: { diagram: '420mm 297mm', sheet: '210mm 297mm', margin: '10mm 10mm 15mm', drawingW: '400mm', drawingH: '272mm' }
}

// Chaîne CSS entre guillemets : antislash et guillemets échappés, sauts de ligne remplacés par une espace.
export function cssString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\r\n]+/g, ' ')}"`
}

export function footerLines(meta: Project['meta']): { left: string; center: string } {
  return {
    left: [meta.title, meta.course, meta.authors.join(', ')].filter((x): x is string => typeof x === 'string' && x.trim() !== '').join(' · '),
    center: `Rév. ${meta.revision} · ${meta.date} · ${STATUS_LABELS[meta.status]}`
  }
}

const BOX = "font-family: 'IBM Plex Mono', monospace; font-size: 7.5pt; color: #4a4a46;"

// Règles @page : formats nommés et cartouche compact au pied de chaque page (spec § 11.1).
export function pageCss(format: PdfFormat, meta: Project['meta']): string {
  const f = PAGE_FORMATS[format]
  const { left, center } = footerLines(meta)
  return [
    `@page { margin: ${f.margin}; @bottom-left { content: ${cssString(left)}; ${BOX} } @bottom-center { content: ${cssString(center)}; ${BOX} } @bottom-right { content: "Page " counter(page) " / " counter(pages); ${BOX} } }`,
    `@page diagram { size: ${f.diagram}; }`,
    `@page sheet { size: ${f.sheet}; }`,
    `:root { --drawing-w: ${f.drawingW}; --drawing-h: ${f.drawingH}; }`
  ].join('\n')
}
