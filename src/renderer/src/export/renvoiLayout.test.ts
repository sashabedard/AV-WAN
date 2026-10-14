import { describe, expect, it } from 'vitest'
import { layoutStubs, unionRect, type StubInput } from './renvoiLayout'

const at = (key: string, x: number, label = 'C-001 › SW-2 · SFP+1 · Salle p. 3'): StubInput => ({ key, linkId: key, deviceId: 'd', x, y: 100, side: 'bottom', exit: 0, label })

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
})
