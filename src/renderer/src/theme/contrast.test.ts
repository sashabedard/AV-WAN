import { describe, expect, it } from 'vitest'
import { contrastRatio } from './contrast'

describe('contrastRatio', () => {
  it('vaut 21 entre noir et blanc, 1 entre deux couleurs identiques', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrastRatio('#3E8EF7', '#3E8EF7')).toBeCloseTo(1, 5)
  })

  it('refuse une couleur mal formée', () => {
    expect(() => contrastRatio('bleu', '#FFFFFF')).toThrow('Couleur invalide')
  })
})
