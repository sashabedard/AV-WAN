// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { ICON_MAX_BYTES, importIconFile, normalizeColor, sanitizeSvg } from './importIcon'

const enc = (s: string): Uint8Array => new TextEncoder().encode(s)
const svgOf = (dataUri: string): string => new TextDecoder().decode(Uint8Array.from(atob(dataUri.split(',')[1]!), (c) => c.charCodeAt(0)))
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
const NS = 'xmlns="http://www.w3.org/2000/svg"'

describe('sanitizeSvg', () => {
  it('retire scripts, gestionnaires, liens, url(), style, foreignObject, use et image', () => {
    const svg = `<svg ${NS} xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24" onload="alert(1)">
      <script>alert(2)</script>
      <style>path{fill:url(http://x/y)}</style>
      <foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>
      <a href="https://x"><path d="M0 0L1 1"/></a>
      <use xlink:href="https://x/sprite.svg#a"/>
      <image href="https://x/a.png"/>
      <path d="M2 2H22" stroke="#000" style="fill:red" onclick="x()" fill="url(#g)"/>
    </svg>`
    const clean = sanitizeSvg(svg)
    expect(clean).not.toBeNull()
    expect(clean!.svg).not.toMatch(/script|onload|onclick|style|foreignObject|href|url\(|<a[\s>]|<use|<image/i)
    expect(clean!.svg).toContain('d="M2 2H22"')
    expect(clean!.svg).toContain('stroke="#000"')
  })

  it('retire une valeur dont url( est écrit avec une barre oblique inverse', () => {
    const out = sanitizeSvg(`<svg ${NS}><path d="M1 1" stroke="#000" fill="u\\rl(https://x/y)"/></svg>`)!.svg
    expect(out).not.toContain('\\')
    expect(out).not.toContain('x/y')
  })

  it('convertit le style en attributs, le style l’emporte, les valeurs dangereuses sont retirées', () => {
    const ink = sanitizeSvg(`<svg ${NS}><path style="fill:none;stroke:#e30613;stroke-width:2" d="M2 2L22 22"/></svg>`)!
    expect(ink.svg).toContain('stroke="#e30613"')
    expect(ink.svg).toContain('fill="none"')
    expect(ink.svg).toContain('stroke-width="2"')
    expect(ink.svg).not.toContain('style')
    expect(ink.monochrome).toBe(true)
    for (const style of ['fill:u\\rl(x)', 'fill:url(#g)', 'behavior:url(x)']) {
      const out = sanitizeSvg(`<svg ${NS}><path d="M1 1" stroke="#000" style="${style}"/></svg>`)!.svg
      expect(out).not.toMatch(/style|url|behavior|\\/)
    }
    expect(sanitizeSvg(`<svg ${NS}><path fill="#000" style="fill:#e11 !important" d="M1 1"/></svg>`)!.svg).toContain('fill="#e11"')
  })

  it('refuse un SVG sans aucune peinture visible', () => {
    expect(sanitizeSvg(`<svg ${NS}><path d="M1 1" fill="none"/></svg>`)).toBeNull()
  })

  it('ajoute un viewBox depuis width et height, sinon 0 0 24 24, et retire la taille fixe', () => {
    const sized = sanitizeSvg(`<svg ${NS} width="48" height="32"><rect width="10" height="10"/></svg>`)!.svg
    expect(sized).toContain('viewBox="0 0 48 32"')
    expect(sized).not.toMatch(/<svg[^>]*\swidth=/)
    expect(sanitizeSvg(`<svg ${NS}><circle r="4"/></svg>`)!.svg).toContain('viewBox="0 0 24 24"')
  })

  it('détecte un SVG monochrome, couleurs héritées et noir par défaut compris', () => {
    expect(sanitizeSvg(`<svg ${NS} viewBox="0 0 24 24"><g fill="#000"><path d="M1 1"/><circle r="2" fill="black"/></g></svg>`)!.monochrome).toBe(true)
    expect(sanitizeSvg(`<svg ${NS} viewBox="0 0 24 24"><path d="M1 1"/><circle r="2" fill="#e11"/></svg>`)!.monochrome).toBe(false)
    expect(sanitizeSvg(`<svg ${NS} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 1"/></svg>`)!.monochrome).toBe(true)
  })

  it('refuse ce qui n’est pas un SVG, un SVG mal formé ou sans forme', () => {
    expect(sanitizeSvg('<html><body/></html>')).toBeNull()
    expect(sanitizeSvg(`<svg ${NS}><path d="M1 1"></svg>`)).toBeNull()
    expect(sanitizeSvg(`<svg ${NS}><title>vide</title></svg>`)).toBeNull()
  })
})

describe('importIconFile', () => {
  it('garde un PNG tel quel', () => {
    expect(importIconFile('logo.png', PNG)).toEqual({ ok: true, icon: { kind: 'image', dataUri: expect.stringMatching(/^data:image\/png;base64,iVBORw0KGgo/) } })
  })

  it('assainit un SVG et marque tint s’il est monochrome', () => {
    const r = importIconFile('capteur.svg', enc(`<svg ${NS} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#123456" onclick="x()"/></svg>`))
    if (!r.ok || r.icon.kind !== 'image') throw new Error('import refusé')
    expect(r.icon.tint).toBe(true)
    expect(r.icon.dataUri).toMatch(/^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/)
    expect(svgOf(r.icon.dataUri)).not.toContain('onclick')
  })

  it('refuse un fichier trop lourd, ni SVG ni PNG, ou un SVG sans forme', () => {
    expect(importIconFile('gros.png', new Uint8Array(ICON_MAX_BYTES + 1))).toEqual({ ok: false, error: 'L’icône dépasse 256 Ko.' })
    expect(importIconFile('notes.txt', enc('bonjour'))).toEqual({ ok: false, error: 'Ce fichier n’est ni un SVG ni un PNG.' })
    expect(importIconFile('vide.svg', enc(`<svg ${NS}></svg>`))).toEqual({ ok: false, error: 'Ce SVG ne contient aucune forme utilisable.' })
  })
})

describe('SVG pathologique', () => {
  it('est refusé sans exception', () => {
    const deep = `<svg ${NS}>${'<g>'.repeat(2000)}<path d="M1 1"/>${'</g>'.repeat(2000)}</svg>`
    expect(importIconFile('profond.svg', enc(deep))).toEqual({ ok: false, error: 'Ce SVG ne contient aucune forme utilisable.' })
  })
})

describe('normalizeColor', () => {
  it('ramène les écritures d’une même couleur à une seule', () => {
    expect(normalizeColor(' #ABC ')).toBe('#aabbcc')
    expect(normalizeColor('Black')).toBe('#000000')
    expect(normalizeColor('currentColor')).toBe('currentcolor')
  })
})
