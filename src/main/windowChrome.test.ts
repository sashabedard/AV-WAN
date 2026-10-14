import { describe, expect, it } from 'vitest'
import { TOP_BAR_HEIGHT, chromeOptions, cssColorToHex, menuPosition, titleBarColors } from './windowChrome'

describe('chromeOptions', () => {
  it('macOS : barre de titre masquée, pastilles centrées sur la barre de l’app', () => {
    expect(chromeOptions('darwin')).toEqual({ titleBarStyle: 'hidden', trafficLightPosition: { x: 16, y: 15 } })
  })

  it('Windows : boutons natifs superposés, à la hauteur de la barre de l’app', () => {
    expect(chromeOptions('win32')).toEqual({
      titleBarStyle: 'hidden',
      titleBarOverlay: { color: '#15181b', symbolColor: '#ece7dc', height: TOP_BAR_HEIGHT }
    })
  })
})

describe('cssColorToHex', () => {
  it('convertit les couleurs calculées par le navigateur', () => {
    expect(cssColorToHex('rgb(21, 24, 27)')).toBe('#15181b')
    expect(cssColorToHex('rgba(236, 231, 220, 1)')).toBe('#ece7dc')
    expect(cssColorToHex(' #ABCDEF ')).toBe('#abcdef')
  })

  it('refuse tout le reste', () => {
    for (const bad of ['rgb(300, 0, 0)', 'red', 'url(x)', '#abc', '', 42, null, 'rgb(1,2)']) expect(cssColorToHex(bad)).toBeNull()
  })
})

describe('titleBarColors', () => {
  it('rend les deux couleurs, ou rien si l’une est invalide', () => {
    expect(titleBarColors({ color: 'rgb(255, 255, 255)', symbolColor: 'rgb(30, 31, 34)' })).toEqual({ color: '#ffffff', symbolColor: '#1e1f22' })
    expect(titleBarColors({ color: 'rgb(255, 255, 255)', symbolColor: 'bleu' })).toBeNull()
    expect(titleBarColors('rgb(0,0,0)')).toBeNull()
  })
})

describe('menuPosition', () => {
  it('garde des coordonnées entières et positives', () => {
    expect(menuPosition({ x: 12.6, y: 44 })).toEqual({ x: 13, y: 44 })
    expect(menuPosition({ x: -5, y: Number.NaN })).toBeNull()
    expect(menuPosition(undefined)).toBeNull()
  })
})
