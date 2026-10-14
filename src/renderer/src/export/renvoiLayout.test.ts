import { describe, expect, it } from 'vitest'
import { fallbackInput, layoutStubs, unionRect, type StubInput } from './renvoiLayout'

const at = (key: string, x: number, label = 'C-001 › SW-2 · SFP+1 · Salle p. 3'): StubInput => ({ key, linkId: key, deviceId: 'd', x, y: 100, side: 'bottom', node: { x: 0, y: 80, w: 200, h: 40 }, label })

describe('layoutStubs', () => {
  it('allonge les bouts d’un même côté et garde le plus long à gauche', () => {
    const all = layoutStubs([at('a', 10), at('b', 30), at('c', 50)])
    const [a, b, c] = ['a', 'b', 'c'].map((k) => all.find((s) => s.key === k)!)
    expect(a!.y2).toBeGreaterThan(b!.y2)
    expect(b!.y2).toBeGreaterThan(c!.y2)
  })
  it('ne superpose aucune boîte d’étiquette', () => {
    const s = layoutStubs([at('a', 10), at('b', 30), at('c', 50)])
    for (const p of s) for (const q of s) if (p !== q) expect(p.box.y + p.box.h <= q.box.y || q.box.y + q.box.h <= p.box.y).toBe(true)
  })
  it('l’union englobe la zone et les étiquettes', () => {
    const u = unionRect({ x: 0, y: 0, w: 100, h: 100 }, [{ x: -10, y: 90, w: 50, h: 40 }])
    expect(u).toEqual({ x: -10, y: 0, w: 110, h: 130 })
  })

  it('part du bord du nœud, pas du centre du port', () => {
    const [bottom] = layoutStubs([at('b', 30)])
    expect([bottom!.x1, bottom!.y1]).toEqual([30, 120])
    const [top] = layoutStubs([{ ...at('t', 30), side: 'top' }])
    expect([top!.x1, top!.y1]).toEqual([30, 80])
    expect(top!.y2).toBeLessThan(80)
  })

  it('empile sans recouvrement les étiquettes des côtés gauche et droit', () => {
    for (const side of ['left', 'right'] as const) {
      const s = layoutStubs([0, 1, 2].map((i) => ({ ...at(`p${i}`, 0), side, y: 100 + i * 4 })))
      const sorted = [...s].sort((a, b) => a.box.y - b.box.y)
      for (let i = 1; i < sorted.length; i++) expect(sorted[i]!.box.y).toBeGreaterThanOrEqual(sorted[i - 1]!.box.y + sorted[i - 1]!.box.h)
    }
  })

  it('port introuvable : part du milieu du bord bas du nœud', () => {
    const { x, y, side, ...rest } = at('f', 0)
    void x
    void y
    void side
    const [f] = layoutStubs([fallbackInput(rest)])
    expect([f!.x1, f!.y1]).toEqual([100, 120])
    expect(f!.box.y).toBe(f!.y2)
  })
})
