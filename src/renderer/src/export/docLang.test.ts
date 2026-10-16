// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadDocLang, saveDocLang } from './docLang'

describe('langue des documents', () => {
  beforeEach(() => localStorage.clear())

  it('rend la langue de repli sans valeur enregistrée', () => {
    expect(loadDocLang('fr')).toBe('fr')
    expect(loadDocLang('en')).toBe('en')
  })

  it('rend la langue de repli pour une valeur invalide', () => {
    localStorage.setItem('avwan.docLang', 'de')
    expect(loadDocLang('en')).toBe('en')
  })

  it('relit la valeur enregistrée', () => {
    saveDocLang('en')
    expect(loadDocLang('fr')).toBe('en')
    expect(localStorage.getItem('avwan.docLang')).toBe('en')
  })
})
