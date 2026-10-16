import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { decimalText, formatFr, parseDecimalField, parseIntField } from './fields'
import { formatters } from '../../../shared/i18n/format'

describe('parseIntField', () => {
  it('lit un entier dans ses bornes, vide = effacer, le reste = refusé', () => {
    expect(parseIntField(' 33 ', 1, 512)).toBe(33)
    expect(parseIntField('', 1, 512)).toBeNull()
    expect(parseIntField('  ', 1, 512)).toBeNull()
    expect(parseIntField('0', 1, 512)).toBeUndefined()
    expect(parseIntField('600', 1, 512)).toBeUndefined()
    expect(parseIntField('12,5', 1, 512)).toBeUndefined()
    expect(parseIntField('abc', 1, 512)).toBeUndefined()
    expect(parseIntField('-1', 0, 63999)).toBeUndefined()
    expect(parseIntField('0', 0, 63999)).toBe(0)
  })
})

describe('milliers à la française', () => {
  it('entier : « 1 500 » avec une espace ordinaire, insécable ou fine insécable', () => {
    expect(parseIntField('1 500', 0, 63999)).toBe(1500)
    expect(parseIntField('1\u00A0500', 0, 63999)).toBe(1500)
    expect(parseIntField('1\u202F500', 0, 63999)).toBe(1500)
    expect(parseIntField(' 12 345 ', 0, 63999)).toBe(12345)
    expect(parseIntField('70 000', 0, 63999)).toBeUndefined() // toujours dans les bornes
  })

  it('décimal : « 1 500,5 », et relit ce que formatFr écrit', () => {
    expect(parseDecimalField('1 500', false, 'fr')).toBe(1500)
    expect(parseDecimalField('1 500,5', false, 'fr')).toBe(1500.5)
    expect(parseDecimalField('1\u202F234.5', false, 'fr')).toBe(1234.5)
    expect(parseDecimalField(formatFr(12345.6), false, 'fr')).toBe(12345.6)
  })

  it('une espace ailleurs qu’entre des groupes de trois chiffres est refusée', () => {
    expect(parseIntField('1 5', 0, 63999)).toBeUndefined()
    expect(parseIntField('15 00', 0, 63999)).toBeUndefined()
    expect(parseDecimalField('1 2', false, 'fr')).toBeUndefined()
    expect(parseDecimalField('1 500 ,5', false, 'fr')).toBeUndefined()
  })
})

describe('parseDecimalField', () => {
  it('accepte la virgule et le point', () => {
    expect(parseDecimalField('14,4', false, 'fr')).toBe(14.4)
    expect(parseDecimalField('14.4', false, 'fr')).toBe(14.4)
    expect(parseDecimalField('0', false, 'fr')).toBe(0)
    expect(parseDecimalField('', false, 'fr')).toBeNull()
    expect(parseDecimalField('abc', false, 'fr')).toBeUndefined()
    expect(parseDecimalField('-3', false, 'fr')).toBeUndefined()
    expect(parseDecimalField('1,2,3', false, 'fr')).toBeUndefined()
  })

  it('refuse zéro quand la valeur doit être positive', () => {
    expect(parseDecimalField('0', true, 'fr')).toBeUndefined()
    expect(parseDecimalField('0,5', true, 'fr')).toBe(0.5)
  })
})

describe('formatFr', () => {
  it('le source n’a aucune espace invisible littérale (échappements \\u00A0, \\u202F)', () => {
    const text = readFileSync(new URL('./fields.ts', import.meta.url), 'utf8')
    expect(/[\u00A0\u202F]/.test(text)).toBe(false)
  })

  it('écrit à la française, espace des milliers', () => {
    expect(formatFr(1200)).toBe('1 200')
    expect(formatFr(14.4)).toBe('14,4')
    expect(formatFr(3, 1)).toBe('3,0')
    expect(formatFr(72.04)).toBe('72')
  })
})

describe('nombres selon la langue (plan 6)', () => {
  it('« 12.5 » et « 12,5 » sont acceptés dans les deux langues, l’affichage suit la langue', () => {
    expect(parseDecimalField('12.5', false, 'fr')).toBe(12.5)
    expect(parseDecimalField('12,5', false, 'fr')).toBe(12.5)
    expect(formatters('en').num(12.5)).toBe('12.5')
    expect(formatters('fr').num(12.5)).toBe('12,5')
    expect(decimalText(12.5, 'en')).toBe('12.5')
    expect(decimalText(12.5, 'fr')).toBe('12,5')
    expect(decimalText(1200.25, 'en')).toBe('1200.25')
    expect(formatFr(12.5)).toBe(formatters('fr').num(12.5))
  })
})

describe('virgule de milliers en anglais', () => {
  it('EN : « 1,200 » → 1200, « 12,345.5 » → 12345.5, le reste inchangé', () => {
    expect(parseDecimalField('1,200', false, 'en')).toBe(1200)
    expect(parseDecimalField('12,345.5', false, 'en')).toBe(12345.5)
    expect(parseDecimalField('12,5', false, 'en')).toBe(12.5)
    expect(parseDecimalField('12.5', false, 'en')).toBe(12.5)
  })
  it('EN : « 0,750 » (zéro de tête) vaut 0,75, pas 750', () => {
    expect(parseDecimalField('0,750', false, 'en')).toBe(0.75)
    expect(parseDecimalField('1,200', false, 'en')).toBe(1200)
  })

  it('FR inchangé : « 1,200 » → 1,2', () => {
    expect(parseDecimalField('1,200', false, 'fr')).toBe(1.2)
    expect(parseDecimalField('1,200', false, 'fr')).toBe(1.2)
    expect(parseDecimalField('12,5', false, 'fr')).toBe(12.5)
  })
})
