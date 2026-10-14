import { describe, expect, it } from 'vitest'
import { cssString, footerLines, pageCss } from './pageCss'

const meta = { title: 'Lumen "Nord"', course: 'Atelier réseau', authors: ['A. B', 'C. D'], date: '2026-10-13', revision: 'B', status: 'conception' as const }

describe('pageCss', () => {
  it('nomme les pages : schéma en Tabloïd paysage et tableaux en Lettre, ou A3 et A4', () => {
    expect(pageCss('na', meta)).toContain('@page diagram { size: 17in 11in; }')
    expect(pageCss('na', meta)).toContain('@page sheet { size: 8.5in 11in; }')
    expect(pageCss('iso', meta)).toContain('@page diagram { size: 420mm 297mm; }')
    expect(pageCss('iso', meta)).toContain('@page sheet { size: 210mm 297mm; }')
  })

  it('met le cartouche et « Page x / y » au pied de chaque page, avec un texte échappé', () => {
    const css = pageCss('na', meta)
    expect(css).toContain('@bottom-left { content: "Lumen \\"Nord\\" · Atelier réseau · A. B, C. D";')
    expect(css).toContain('@bottom-center { content: "Rév. B · 2026-10-13 · Conception";')
    expect(css).toContain('@bottom-right { content: "Page " counter(page) " / " counter(pages);')
  })

  it('n’écrit pas de champ vide dans le pied de page', () => {
    expect(footerLines({ ...meta, course: undefined, authors: [] }).left).toBe('Lumen "Nord"')
  })

  it('échappe antislash et sauts de ligne', () => {
    expect(cssString('a\\b\nc')).toBe('"a\\\\b c"')
  })
})
