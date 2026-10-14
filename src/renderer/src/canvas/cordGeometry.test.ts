import { describe, expect, it } from 'vitest'
import { bandRects, bootRect } from './cordGeometry'

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
})
