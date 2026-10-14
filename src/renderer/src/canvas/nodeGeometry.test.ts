import { describe, expect, it } from 'vitest'
import type { Side } from '../model/types'
import { DEVICE_NODE_HEIGHT, TAPE_LEFT, TAPE_TOP_MAX_WIDTH, deviceNodeWidth, devicePortOffset, portOffset } from './nodeGeometry'

const HALF = 5 // .react-flow__handle.port : 10 px de large

describe('devicePortOffset', () => {
  it("les prises du haut ne chevauchent jamais l'étiquette du nom", () => {
    const tapeStart = TAPE_LEFT
    const tapeEnd = TAPE_LEFT + TAPE_TOP_MAX_WIDTH
    for (let width = 176; width <= deviceNodeWidth(48); width++) {
      for (let count = 1; count <= 8; count++) {
        for (let i = 0; i < count; i++) {
          const x = devicePortOffset('top', i, count, width)
          const clear = x - HALF >= tapeEnd || x + HALF <= tapeStart
          expect(clear, `largeur ${width}, ${count} prises, prise ${i} à x=${x}`).toBe(true)
          expect(x + HALF).toBeLessThanOrEqual(width)
        }
      }
    }
  })

  it('les prises du haut restent dans l’ordre et ne se superposent pas', () => {
    for (let count = 2; count <= 8; count++) {
      const xs = Array.from({ length: count }, (_, i) => devicePortOffset('top', i, count, deviceNodeWidth(count)))
      for (let i = 1; i < count; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(2 * HALF)
    }
  })

  it('les autres côtés gardent la répartition sur toute la longueur du bord', () => {
    const width = deviceNodeWidth(3)
    const cases: [Side, number][] = [
      ['bottom', width],
      ['left', DEVICE_NODE_HEIGHT],
      ['right', DEVICE_NODE_HEIGHT]
    ]
    for (const [side, length] of cases) {
      for (let i = 0; i < 3; i++) expect(devicePortOffset(side, i, 3, width)).toBe(portOffset(i, 3, length))
    }
  })
})
