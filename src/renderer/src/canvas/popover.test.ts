import { describe, expect, it } from 'vitest'
import { clampPopover } from './popover'

describe('clampPopover', () => {
  const size = { w: 336, h: 420 }
  const view = { w: 1440, h: 900 }
  it('garde le point de dépôt quand la place suffit', () => {
    expect(clampPopover({ x: 300, y: 200 }, size, view)).toEqual({ left: 300, top: 200 })
  })
  it('reste dans la fenêtre des deux côtés', () => {
    expect(clampPopover({ x: 1400, y: 880 }, size, view)).toEqual({ left: 1440 - 336 - 8, top: 900 - 420 - 8 })
    expect(clampPopover({ x: -50, y: 2 }, size, view)).toEqual({ left: 8, top: 8 })
    expect(clampPopover({ x: 100, y: 100 }, size, { w: 200, h: 200 })).toEqual({ left: 8, top: 8 })
  })
})
