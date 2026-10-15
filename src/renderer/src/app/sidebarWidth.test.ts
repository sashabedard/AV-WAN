// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { SIDEBAR_DEFAULT, SIDEBAR_MAX, SIDEBAR_MIN, SIDEBAR_WIDTH_KEY, clampSidebarWidth, loadSidebarWidth, saveSidebarWidth } from './sidebarWidth'

afterEach(() => localStorage.clear())

describe('sidebarWidth', () => {
  it('borne la largeur entre le minimum et le maximum', () => {
    expect(clampSidebarWidth(50)).toBe(SIDEBAR_MIN)
    expect(clampSidebarWidth(5000)).toBe(SIDEBAR_MAX)
    expect(clampSidebarWidth(300.6)).toBe(301)
    expect(clampSidebarWidth(Number.NaN)).toBe(SIDEBAR_DEFAULT)
  })

  it('relit la largeur enregistrée et ignore une valeur illisible', () => {
    expect(loadSidebarWidth(localStorage)).toBe(SIDEBAR_DEFAULT)
    saveSidebarWidth(340, localStorage)
    expect(localStorage.getItem(SIDEBAR_WIDTH_KEY)).toBe('340')
    expect(loadSidebarWidth(localStorage)).toBe(340)
    localStorage.setItem(SIDEBAR_WIDTH_KEY, 'large')
    expect(loadSidebarWidth(localStorage)).toBe(SIDEBAR_DEFAULT)
  })

  it('sans stockage, garde la largeur d’origine sans lever d’erreur', () => {
    const broken = {
      getItem: () => {
        throw new Error('bloqué')
      },
      setItem: () => {
        throw new Error('bloqué')
      }
    }
    expect(loadSidebarWidth(broken)).toBe(SIDEBAR_DEFAULT)
    expect(() => saveSidebarWidth(300, broken)).not.toThrow()
    expect(loadSidebarWidth(null)).toBe(SIDEBAR_DEFAULT)
  })
})
