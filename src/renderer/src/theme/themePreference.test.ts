// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { applyPreference, loadPreference, nextPreference, readPreference, savePreference, THEME_STORAGE_KEY } from './themePreference'

afterEach(() => {
  delete document.documentElement.dataset['theme']
  localStorage.clear()
})

describe('themePreference', () => {
  it('passe de système à clair, puis sombre, puis système', () => {
    expect(nextPreference('system')).toBe('light')
    expect(nextPreference('light')).toBe('dark')
    expect(nextPreference('dark')).toBe('system')
  })

  it('pose ou retire data-theme sur la racine', () => {
    const root = document.documentElement
    applyPreference('dark', root)
    expect(root.dataset['theme']).toBe('dark')
    expect(readPreference(root)).toBe('dark')
    applyPreference('system', root)
    expect(root.dataset['theme']).toBeUndefined()
    expect(readPreference(root)).toBe('system')
  })

  it('relit la préférence enregistrée et ignore une valeur inconnue', () => {
    savePreference('light', localStorage)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    expect(loadPreference(localStorage)).toBe('light')
    localStorage.setItem(THEME_STORAGE_KEY, 'violet')
    expect(loadPreference(localStorage)).toBe('system')
    expect(loadPreference(null)).toBe('system')
  })

  it('survit à un stockage qui lève une exception', () => {
    const broken = {
      getItem: () => {
        throw new Error('refusé')
      },
      setItem: () => {
        throw new Error('refusé')
      }
    }
    expect(loadPreference(broken)).toBe('system')
    expect(() => savePreference('dark', broken)).not.toThrow()
  })
})
