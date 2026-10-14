import { describe, expect, it } from 'vitest'
import { BAND_PITCH, BAND_START, bandRects, bandReach, beside, bootRect, stubLength, wavesPath } from './cordGeometry'

describe('cordGeometry', () => {
  it('place la botte de la fiche à l’extérieur du port', () => {
    expect(bootRect(100, 50, 'bottom')).toEqual({ x: 96, y: 50, w: 8, h: 8 })
    expect(bootRect(100, 50, 'top')).toEqual({ x: 96, y: 42, w: 8, h: 8 })
    expect(bootRect(100, 50, 'right')).toEqual({ x: 100, y: 46, w: 8, h: 8 })
  })

  it('aligne les bagues de trunk le long du câble, perpendiculaires à lui', () => {
    const [first, second] = bandRects(100, 50, 'bottom', ['#111111', '#222222'], 4.5)
    expect(first).toEqual({ x: 95.75, y: 60.8, w: 8.5, h: 2.4, color: '#111111' })
    expect(second!.y).toBeCloseTo(64.8, 5)
    const [side] = bandRects(100, 50, 'left', ['#333333'], 4.5)
    expect(side).toEqual({ x: 86.8, y: 45.75, w: 2.4, h: 8.5, color: '#333333' })
  })

  it('mesure la portée des bagues et allonge le tronçon droit en conséquence', () => {
    expect(bandReach(0)).toBe(0)
    expect(bandReach(1)).toBe(BAND_START + 2)
    expect(bandReach(6)).toBe(BAND_START + 5 * BAND_PITCH + 2)
    expect(stubLength(0)).toBe(14)
    expect(stubLength(6)).toBe(bandReach(6) + 6)
  })

  it('place un repère à côté du câble, le long de sa sortie', () => {
    expect(beside(100, 50, 'bottom', 14, 9)).toEqual({ x: 91, y: 64 })
    expect(beside(100, 50, 'right', 14, 9)).toEqual({ x: 114, y: 59 })
  })

  it('dessine les ondes Wi-Fi centrées sur un point', () => {
    expect(wavesPath(10, 20)).toBe('M4 19A8 8 0 0 1 16 19M6.5 21.5A5 5 0 0 1 13.5 21.5')
  })
})
