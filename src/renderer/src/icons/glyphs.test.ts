import { describe, expect, it } from 'vitest'
import { BUILTIN_ICON_NAMES } from '../catalog/iconNames'
import { CATEGORY_ORDER } from '../catalog/categories'
import { TEMPLATES } from '../catalog/templates'
import { CATEGORY_ICON, GLYPHS, UI_GLYPHS, isBuiltinIcon } from './glyphs'

// Suit les points d'arrivée d'un tracé en commandes absolues (M L H V A Z) : assez pour borner l'icône.
function endpoints(d: string): Array<[number, number]> {
  const out: Array<[number, number]> = []
  let x = 0
  let y = 0
  for (const [, cmd, args] of d.matchAll(/([MLHVAZ])([^MLHVAZ]*)/g)) {
    const n = (args!.match(/-?(?:\d+\.?\d*|\.\d+)/g) ?? []).map(Number)
    if (cmd === 'M' || cmd === 'L') for (let i = 0; i + 1 < n.length; i += 2) out.push([(x = n[i]!), (y = n[i + 1]!)])
    else if (cmd === 'H') for (const v of n) out.push([(x = v), y])
    else if (cmd === 'V') for (const v of n) out.push([x, (y = v)])
    else if (cmd === 'A') for (let i = 0; i + 6 < n.length; i += 7) out.push([(x = n[i + 5]!), (y = n[i + 6]!)])
  }
  return out
}

const ALL = { ...GLYPHS, ...UI_GLYPHS } as Record<string, readonly string[]>

describe('glyphes', () => {
  it('dessine chaque icône intégrée, chaque gabarit et chaque catégorie', () => {
    for (const name of BUILTIN_ICON_NAMES) expect(GLYPHS[name].length, name).toBeGreaterThan(0)
    for (const t of TEMPLATES) expect(t.icon.kind === 'builtin' && isBuiltinIcon(t.icon.name), t.id).toBe(true)
    for (const c of CATEGORY_ORDER) expect(isBuiltinIcon(CATEGORY_ICON[c]), c).toBe(true)
  })

  it('n’emploie que des commandes absolues M L H V A Z', () => {
    for (const [name, paths] of Object.entries(ALL)) {
      for (const d of paths) expect(d, name).toMatch(/^M[MLHVAZ\d\s.-]*$/)
    }
  })

  it('reste dans la grille de 24 avec une marge d’un pixel', () => {
    for (const [name, paths] of Object.entries(ALL)) {
      for (const d of paths) {
        for (const [px, py] of endpoints(d)) {
          expect(px >= 1 && px <= 23 && py >= 1 && py <= 23, `${name} : (${px}, ${py}) dans ${d}`).toBe(true)
        }
      }
    }
  })

  it('ne mélange pas les noms d’interface et les noms d’appareils', () => {
    for (const name of Object.keys(UI_GLYPHS)) expect(isBuiltinIcon(name), name).toBe(false)
  })
})
