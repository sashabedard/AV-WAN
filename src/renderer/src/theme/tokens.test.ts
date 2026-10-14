import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8')

function declarations(name: string): string[] {
  return [...css.matchAll(new RegExp(`--${name}:\\s*([^;]+);`, 'g'))].map((m) => m[1]!.trim())
}

describe('tokens.css', () => {
  it('n’a plus de bloc sombre dupliqué : chaque jeton est défini une seule fois', () => {
    expect(css).not.toContain('prefers-color-scheme')
    for (const name of ['paper', 'ink', 'accent', 'tape', 'surface', 'tile-top', 'trunk']) {
      expect(declarations(name), name).toHaveLength(1)
    }
  })

  it('suit la table de la spec § 8.1 (clair, puis sombre)', () => {
    expect(declarations('paper')).toEqual(['light-dark(#eeeae0, #15181b)'])
    expect(declarations('accent')).toEqual(['light-dark(#c2410c, #f2a93b)'])
    expect(declarations('tape')).toEqual(['light-dark(#1e1f22, #f3efe4)'])
    expect(declarations('tape-ink')).toEqual(['light-dark(#f3efe4, #141414)'])
  })

  it('garde le matériel identique dans les deux thèmes (amendement 11)', () => {
    expect(declarations('led-off')).toEqual(['#3a3f45'])
    expect(declarations('panel-top')).toEqual(['#2c3137'])
    expect(declarations('sfp-stroke')).toEqual(['#5a616a'])
  })

  it('force color-scheme quand le thème est choisi à la main', () => {
    expect(css).toMatch(/:root\[data-theme='light'\]\s*\{\s*color-scheme:\s*light;/)
    expect(css).toMatch(/:root\[data-theme='dark'\]\s*\{\s*color-scheme:\s*dark;/)
  })
})
