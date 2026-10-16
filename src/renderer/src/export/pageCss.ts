import type { Project } from '../model/types'
import type { PdfFormat } from '../../../shared/pdfOptions'
import type { Lang } from '../../../shared/i18n/lang'
import { messages } from '../../../shared/i18n/messages'

// Formats du PDF (spec § 11.1) : schéma en paysage, le reste en portrait. Marges de 0,4 po (10 mm),
// 0,6 po (15 mm) en bas pour le pied de page. `drawing` : la zone utile d'une page de schéma.
export const PAGE_FORMATS: Record<PdfFormat, { diagram: string; sheet: string; margin: string; drawingW: string; drawingH: string }> = {
  na: { diagram: '17in 11in', sheet: '8.5in 11in', margin: '0.4in 0.4in 0.6in', drawingW: '16.2in', drawingH: '10in' },
  iso: { diagram: '420mm 297mm', sheet: '210mm 297mm', margin: '10mm 10mm 15mm', drawingW: '400mm', drawingH: '272mm' }
}

// Chaîne CSS entre guillemets : antislash et guillemets échappés. Tout caractère de contrôle (saut de ligne,
// saut de page \f, tabulation, NUL…) devient une espace : un \f ou un \r\n terminerait la chaîne, et le
// reste du texte (venu du fichier .avwan) serait lu comme des règles CSS.
export function cssString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/[\u0000-\u001F\u007F]+/g, ' ')}"`
}

export function footerLines(meta: Project['meta'], lang: Lang): { left: string; center: string } {
  const { footer, status } = messages(lang).pdf
  return {
    left: [meta.title, meta.course, meta.authors.join(', ')].filter((x): x is string => typeof x === 'string' && x.trim() !== '').join(' · '),
    center: `${footer.revision} ${meta.revision} · ${meta.date} · ${status[meta.status]}`
  }
}

const BOX = "font-family: 'IBM Plex Mono', monospace; font-size: 6.5pt; color: #4a4a46;"

// Règles @page : formats nommés et cartouche compact au pied de chaque page (spec § 11.1).
export function pageCss(format: PdfFormat, meta: Project['meta'], lang: Lang): string {
  const f = PAGE_FORMATS[format]
  const { left, center } = footerLines(meta, lang)
  const page = cssString(`${messages(lang).pdf.footer.page} `)
  return [
    `@page { margin: ${f.margin}; @bottom-left { content: ${cssString(left)}; ${BOX} } @bottom-center { content: ${cssString(center)}; ${BOX} } @bottom-right { content: ${page} counter(page) " / " counter(pages); ${BOX} } }`,
    `@page diagram { size: ${f.diagram}; }`,
    `@page sheet { size: ${f.sheet}; }`,
    `:root { --drawing-w: ${f.drawingW}; --drawing-h: ${f.drawingH}; }`
  ].join('\n')
}
