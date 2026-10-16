import { describe, expect, it } from 'vitest'
import { detectLang, isLang, langFromArgv } from './lang'

describe('detectLang', () => {
  it('prend le français si la première langue préférée est du français, sinon l’anglais', () => {
    expect(detectLang(['fr-CA', 'en-US'])).toBe('fr')
    expect(detectLang(['fr'])).toBe('fr')
    expect(detectLang(['FR-fr'])).toBe('fr')
    expect(detectLang(['en-US', 'fr-CA'])).toBe('en')
    expect(detectLang(['de-DE'])).toBe('en')
    expect(detectLang([])).toBe('en')
  })
})

describe('isLang et langFromArgv', () => {
  it('ne reconnaît que fr et en', () => {
    expect(isLang('fr')).toBe(true)
    expect(isLang('en')).toBe(true)
    expect(isLang('de')).toBe(false)
    expect(isLang(42)).toBe(false)
    expect(isLang(undefined)).toBe(false)
  })
  it('lit --avwan-lang=… dans les arguments, français par défaut', () => {
    expect(langFromArgv(['electron', '--avwan-lang=en'])).toBe('en')
    expect(langFromArgv(['--avwan-lang=xx'])).toBe('fr')
    expect(langFromArgv([])).toBe('fr')
  })
})
