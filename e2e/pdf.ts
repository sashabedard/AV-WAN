import { readFileSync } from 'node:fs'

export interface PdfPage {
  width: number // en points PDF
  height: number
  text: string
}

// Lit un PDF avec pdf.js : taille de chaque page et texte extractible (spec § 13).
export async function readPdf(path: string): Promise<{ pages: PdfPage[]; bytes: Buffer }> {
  const bytes = readFileSync(path)
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  // pdf.js 6 n'évalue plus de code (option isEvalSupported retirée) et se libère par sa tâche de chargement.
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes) })
  const doc = await task.promise
  const pages: PdfPage[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const [, , width, height] = page.view
    const content = await page.getTextContent()
    const text = content.items.map((it) => ('str' in it ? it.str : '')).join(' ').replace(/\s+/g, ' ')
    pages.push({ width: width ?? 0, height: height ?? 0, text })
  }
  await task.destroy()
  return { pages, bytes }
}

// Un PDF vectoriel ne contient aucune image matricielle (spec § 1, critère 3).
export function hasRasterImage(bytes: Buffer): boolean {
  return /\/Subtype\s*\/Image/.test(bytes.toString('latin1'))
}

// Tailles de page en points, au point près (A3 = 1190,55 × 841,89).
export function near(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1
}
