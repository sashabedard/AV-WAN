import { describe, expect, it } from 'vitest'
import { fr } from './fr'
import { en } from './en'

type Tree = Record<string, unknown>

// Paramètre témoin : chaque propriété lue renvoie une valeur qui vaut 2 en calcul et « ⟦nom⟧ » en texte.
function witness(read: Set<string>): unknown {
  return new Proxy(
    {},
    {
      get: (_t, key) => {
        if (typeof key !== 'string') return undefined
        read.add(key)
        return { [Symbol.toPrimitive]: (hint: string) => (hint === 'number' ? 2 : `⟦${key}⟧`) }
      }
    }
  )
}

function compare(a: unknown, b: unknown, path: string, out: string[]): void {
  if (typeof a === 'string') {
    if (typeof b !== 'string') return void out.push(`${path} : n’est pas une chaîne en anglais`)
    if (!a.trim()) out.push(`${path} : vide en français`)
    if (!b.trim()) out.push(`${path} : vide en anglais`)
    return
  }
  if (typeof a === 'function') {
    if (typeof b !== 'function') return void out.push(`${path} : n’est pas une fonction en anglais`)
    const readFr = new Set<string>()
    const readEn = new Set<string>()
    const ra: unknown = a(witness(readFr))
    const rb: unknown = b(witness(readEn))
    if (typeof ra !== 'string' || !ra.trim()) out.push(`${path} : résultat vide en français`)
    if (typeof rb !== 'string' || !rb.trim()) out.push(`${path} : résultat vide en anglais`)
    const f = [...readFr].sort().join(',')
    const e = [...readEn].sort().join(',')
    if (f !== e) out.push(`${path} : paramètres lus différents (fr : ${f} ; en : ${e})`)
    return
  }
  const ka = Object.keys(a as Tree)
  const kb = Object.keys(b as Tree)
  for (const k of ka) if (!kb.includes(k)) out.push(`${path}.${k} : absent en anglais`)
  for (const k of kb) if (!ka.includes(k)) out.push(`${path}.${k} : absent en français`)
  for (const k of ka) if (kb.includes(k)) compare((a as Tree)[k], (b as Tree)[k], `${path}.${k}`, out)
}

describe('dictionnaires', () => {
  it('fr et en ont les mêmes clés, aucun texte vide et les mêmes paramètres', () => {
    const out: string[] = []
    compare(fr, en, 'm', out)
    expect(out).toEqual([])
  })
})
