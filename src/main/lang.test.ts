import { afterEach, describe, expect, it } from 'vitest'
import { effectiveLang, mainLang, mainMessages, setMainLang } from './lang'

afterEach(() => setMainLang('fr'))

describe('langue du main', () => {
  it('prend le choix enregistré, sinon la langue du système', () => {
    expect(effectiveLang('en', ['fr-CA'])).toBe('en')
    expect(effectiveLang(undefined, ['fr-CA'])).toBe('fr')
    expect(effectiveLang(undefined, ['en-US'])).toBe('en')
  })
  it('donne les messages de la langue courante', () => {
    expect(mainLang()).toBe('fr')
    setMainLang('en')
    expect(mainMessages().common.cancel).toBe('Cancel')
  })
})
