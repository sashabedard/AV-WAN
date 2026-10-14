import type { Side } from '../model/types'

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function outward(side: Side): { x: number; y: number } {
  switch (side) {
    case 'top':
      return { x: 0, y: -1 }
    case 'bottom':
      return { x: 0, y: 1 }
    case 'left':
      return { x: -1, y: 0 }
    case 'right':
      return { x: 1, y: 0 }
  }
}

export function bootRect(x: number, y: number, side: Side, size = 8): Rect {
  const d = outward(side)
  return { x: x + d.x * (size / 2) - size / 2, y: y + d.y * (size / 2) - size / 2, w: size, h: size }
}

export function bandRects(x: number, y: number, side: Side, colors: string[], cordWidth: number): Array<Rect & { color: string }> {
  const d = outward(side)
  const vertical = d.x === 0
  return colors.map((color, i) => {
    const dist = 12 + i * 4
    const w = vertical ? cordWidth + 4 : 2.4
    const h = vertical ? 2.4 : cordWidth + 4
    return { x: x + d.x * dist - w / 2, y: y + d.y * dist - h / 2, w, h, color }
  })
}
