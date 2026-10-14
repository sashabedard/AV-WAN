// src/renderer/src/export/renvoiLayout.ts
import type { Side } from '../model/types'
import { outward, type Rect } from '../canvas/cordGeometry'

export const STUB_BASE = 26 // longueur du premier bout de câble, au-delà du bord du nœud
export const STUB_STEP = 17 // allongement de chaque bout suivant d'un même côté (escalier)
export const LABEL_H = 15
const CHAR_W = 6.8
const LABEL_PAD = 12

// Un port intérieur qui sort de la zone : position de la poignée (coordonnées du schéma), côté, distance jusqu'au bord du nœud.
export interface StubInput {
  key: string
  linkId: string
  deviceId: string
  x: number
  y: number
  side: Side
  exit: number
  label: string
}
export interface Stub extends StubInput {
  x2: number
  y2: number
  box: Rect // boîte de l'étiquette, au bout du câble
}

export function labelWidth(label: string): number {
  return Math.ceil(label.length * CHAR_W + LABEL_PAD)
}

// Étiquettes d'un même côté d'un même appareil en escalier. En haut et en bas, l'étiquette part vers la droite du bout :
// le port le plus à gauche a le bout le plus long, donc aucun câble ne traverse l'étiquette d'un voisin.
export function layoutStubs(inputs: StubInput[]): Stub[] {
  const groups = new Map<string, StubInput[]>()
  for (const s of inputs) {
    const k = `${s.deviceId}|${s.side}`
    groups.set(k, [...(groups.get(k) ?? []), s])
  }
  const out: Stub[] = []
  for (const group of groups.values()) {
    const side = group[0]!.side
    const vertical = outward(side).x === 0
    // Rang 0 = bout le plus court : le plus à droite (haut/bas), le plus proche de l'appareil en bas à gauche (côtés).
    const sorted = [...group].sort((a, b) => (vertical ? b.x - a.x : b.y - a.y) || a.key.localeCompare(b.key))
    sorted.forEach((s, rank) => {
      const d = outward(s.side)
      const len = s.exit + STUB_BASE + rank * STUB_STEP
      const x2 = s.x + d.x * len
      const y2 = s.y + d.y * len
      const w = labelWidth(s.label)
      let box: Rect
      if (s.side === 'bottom') box = { x: x2 - 4, y: y2, w, h: LABEL_H }
      else if (s.side === 'top') box = { x: x2 - 4, y: y2 - LABEL_H, w, h: LABEL_H }
      else if (s.side === 'right') box = { x: x2, y: y2 - LABEL_H / 2, w, h: LABEL_H }
      else box = { x: x2 - w, y: y2 - LABEL_H / 2, w, h: LABEL_H }
      out.push({ ...s, x2, y2, box })
    })
  }
  return out
}

export function unionRect(base: Rect, boxes: Rect[]): Rect {
  let x0 = base.x
  let y0 = base.y
  let x1 = base.x + base.w
  let y1 = base.y + base.h
  for (const b of boxes) {
    x0 = Math.min(x0, b.x)
    y0 = Math.min(y0, b.y)
    x1 = Math.max(x1, b.x + b.w)
    y1 = Math.max(y1, b.y + b.h)
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}
