// src/renderer/src/catalog/poe.test.ts
import { describe, expect, it } from 'vitest'
import { TEMPLATES } from './templates'

describe('PoE du catalogue', () => {
  // Une consommation sans prise alimentée ne compte dans aucun budget (amendement 3 : PoE passif non modélisé).
  it('ne donne une consommation (poeDrawW) qu’à une prise alimentée (poeIn)', () => {
    const bad = TEMPLATES.flatMap((t) => t.ports.filter((p) => p.poeDrawW !== undefined && !p.poeIn).map((p) => `${t.id}:${p.id}`))
    expect(bad).toEqual([])
  })
})
