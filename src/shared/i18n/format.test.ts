import { describe, expect, it } from 'vitest'
import { formatters } from './format'
import { enPlural, frPlural } from './plural'

describe('formatters', () => {
  it('formate les nombres à la française ou à l’anglaise, sans espace insécable', () => {
    expect(formatters('fr').num(1200)).toBe('1 200')
    expect(formatters('fr').num(14.4)).toBe('14,4')
    expect(formatters('fr').num(3, 1)).toBe('3,0')
    expect(formatters('en').num(1200)).toBe('1,200')
    expect(formatters('en').num(14.4)).toBe('14.4')
    expect(formatters('en').num(3, 1)).toBe('3.0')
  })
  it('écrit une quantité avec son unité', () => {
    expect(formatters('fr').qty(12.5, 'm')).toBe('12,5 m')
    expect(formatters('en').qty(12.5, 'm')).toBe('12.5 m')
  })
  it('trie selon la langue', () => {
    expect(['Zone', 'éclairage', 'Audio'].sort(formatters('fr').compare)).toEqual(['Audio', 'éclairage', 'Zone'])
  })
})

describe('pluriels', () => {
  it('0 et 1 au singulier en français ; seul 1 en anglais', () => {
    expect([0, 1, 2].map((n) => frPlural(n, 'appareil', 'appareils'))).toEqual(['appareil', 'appareil', 'appareils'])
    expect([0, 1, 2].map((n) => enPlural(n, 'device', 'devices'))).toEqual(['devices', 'device', 'devices'])
  })
})
