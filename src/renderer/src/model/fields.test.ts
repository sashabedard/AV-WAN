import { describe, expect, it } from 'vitest'
import { formatFr, parseDecimalField, parseIntField } from './fields'

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

describe('parseDecimalField', () => {
  it('accepte la virgule et le point', () => {
    expect(parseDecimalField('14,4')).toBe(14.4)
    expect(parseDecimalField('14.4')).toBe(14.4)
    expect(parseDecimalField('0')).toBe(0)
    expect(parseDecimalField('')).toBeNull()
    expect(parseDecimalField('abc')).toBeUndefined()
    expect(parseDecimalField('-3')).toBeUndefined()
    expect(parseDecimalField('1,2,3')).toBeUndefined()
  })

  it('refuse zéro quand la valeur doit être positive', () => {
    expect(parseDecimalField('0', true)).toBeUndefined()
    expect(parseDecimalField('0,5', true)).toBe(0.5)
  })
})

describe('formatFr', () => {
  it('écrit à la française, espace des milliers', () => {
    expect(formatFr(1200)).toBe('1 200')
    expect(formatFr(14.4)).toBe('14,4')
    expect(formatFr(3, 1)).toBe('3,0')
    expect(formatFr(72.04)).toBe('72')
  })
})
