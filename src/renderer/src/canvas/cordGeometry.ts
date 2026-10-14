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

export const BAND_START = 12
export const BAND_PITCH = 4

// Distance entre la prise et le bout de la dernière bague (0 sans bague).
export function bandReach(count: number): number {
  return count === 0 ? 0 : BAND_START + (count - 1) * BAND_PITCH + 2
}

// Longueur du tronçon droit à la sortie du port : les bagues ne doivent jamais atteindre le coude.
export function stubLength(bands: number, base = 14): number {
  return Math.max(base, bandReach(bands) + 6)
}

// Point situé à `dist` le long de la sortie du port, décalé de `offset` sur le côté.
export function beside(x: number, y: number, side: Side, dist: number, offset: number): { x: number; y: number } {
  const d = outward(side)
  return { x: x + d.x * dist - d.y * offset, y: y + d.y * dist + d.x * offset }
}

// Éclair de 10 px de haut centré sur (0, 0) : placé avec transform="translate(x y)".
export const BOLT_PATH = 'M1 -5L-3 1H0L-1 5L3 -1H0Z'

export function wavesPath(cx: number, cy: number): string {
  return `M${cx - 6} ${cy - 1}A8 8 0 0 1 ${cx + 6} ${cy - 1}M${cx - 3.5} ${cy + 1.5}A5 5 0 0 1 ${cx + 3.5} ${cy + 1.5}`
}

export function bandRects(x: number, y: number, side: Side, colors: string[], cordWidth: number): Array<Rect & { color: string }> {
  const d = outward(side)
  const vertical = d.x === 0
  return colors.map((color, i) => {
    const dist = BAND_START + i * BAND_PITCH
    const w = vertical ? cordWidth + 4 : 2.4
    const h = vertical ? 2.4 : cordWidth + 4
    return { x: x + d.x * dist - w / 2, y: y + d.y * dist - h / 2, w, h, color }
  })
}
