import { describe, expect, it } from 'vitest'
import { RACK_GAP, RACK_INNER_W, RACK_RAIL_W, RACK_STUB_GAP, RACK_STUB_W, RACK_TITLE_H, RACK_U_PX, layoutRacks, rackAt } from './rackLayout'
import { rackSample } from './__fixtures__/rackSample'
import { switchFacade } from '../canvas/switchFacade'
import { buildSwitchPorts } from '../catalog/switch'
import type { Project } from '../model/types'

const twoRacks = (): Project => {
  const p = rackSample()
  return { ...p, racks: [...p.racks!, { id: 'r2', name: 'BAIE-2', heightU: 6 }] }
}
const box = (p: Project, id: string) => layoutRacks(p).racks.find((r) => r.id === id)!
const slot = (p: Project, id: string) => layoutRacks(p).slots.find((s) => s.deviceId === id)!

describe('layoutRacks', () => {
  it('constantes de l’échelle (spec § 8.1)', () => {
    expect(RACK_U_PX).toBe(92)
    expect(RACK_RAIL_W).toBe(24)
    expect(RACK_TITLE_H).toBe(32)
    expect(RACK_GAP).toBe(96)
  })

  it('largeur intérieure : la façade la plus large (48 ports + 4 SFP+) tient sans compression', () => {
    const widest = switchFacade(buildSwitchPorts({ portCount: 48, poe: 'at', sfpPlus: 4, managed: true }))
    expect(RACK_INNER_W).toBe(widest.width)
    expect(widest.height).toBeLessThanOrEqual(RACK_U_PX)
  })

  it('baie 12U : h = 12 × 92 + titre ; largeur = intérieur + deux montants', () => {
    const r = box(rackSample(), 'r1')
    expect(r.h).toBe(12 * 92 + RACK_TITLE_H)
    expect(r.w).toBe(RACK_INNER_W + 2 * RACK_RAIL_W)
  })

  it('appareil 1U en U1 : y = bas de la baie − 92, dans l’intérieur de la baie', () => {
    const p = rackSample()
    const r = box(p, 'r1')
    const s = slot(p, 'sw1')
    expect(s).toMatchObject({ rackId: 'r1', h: RACK_U_PX, w: RACK_INNER_W, x: r.x + RACK_RAIL_W })
    expect(s.y).toBe(r.y + r.h - 92)
  })

  it('appareil 2U en U3 : fente de 2 × 92 dont le haut est en U4', () => {
    const p = rackSample()
    const r = box(p, 'r1')
    const s = slot(p, 'mac')
    expect(s.h).toBe(2 * RACK_U_PX)
    expect(s.y + s.h).toBe(r.y + r.h - 2 * RACK_U_PX)
  })

  it('une 2ᵉ baie est à droite de la 1ʳᵉ, dans l’ordre de project.racks', () => {
    const p = twoRacks()
    const [b1, b2] = layoutRacks(p).racks
    expect(b1!.id).toBe('r1')
    expect(b2!.id).toBe('r2')
    expect(b2!.x).toBeGreaterThanOrEqual(b1!.x + b1!.w + RACK_GAP)
    expect(b2!.h).toBe(6 * 92 + RACK_TITLE_H)
  })

  it('une baie dont un câble sort réserve à sa droite la place des étiquettes de bout de câble', () => {
    const p = twoRacks()
    const [b1, b2] = layoutRacks(p).racks
    expect(b2!.x).toBe(b1!.x + b1!.w + RACK_GAP + RACK_STUB_GAP + RACK_STUB_W)
    const inside = { ...p, links: p.links.filter((l) => l.id !== 'l1') }
    const [c1, c2] = layoutRacks(inside).racks
    expect(c2!.x).toBe(c1!.x + c1!.w + RACK_GAP)
  })

  it('sans baie : rien ; appareil d’une baie absente : pas de fente', () => {
    const p = rackSample()
    expect(layoutRacks({ ...p, racks: undefined })).toEqual({ racks: [], slots: [] })
    const orphan = { ...p, racks: [] }
    expect(layoutRacks(orphan).slots).toEqual([])
  })
})

describe('rackAt', () => {
  const centreOfU = (p: Project, rackId: string, u: number) => {
    const r = box(p, rackId)
    const heightU = p.racks!.find((x) => x.id === rackId)!.heightU
    return { x: r.x + r.w / 2, y: r.y + RACK_TITLE_H + (heightU - u) * RACK_U_PX + RACK_U_PX / 2 }
  }

  it('centre de l’U3 d’une baie → { rackId, u: 3 }', () => {
    const p = rackSample()
    expect(rackAt(p, centreOfU(p, 'r1', 3), 1)).toEqual({ rackId: 'r1', u: 3 })
    expect(rackAt(p, centreOfU(p, 'r1', 12), 1)).toEqual({ rackId: 'r1', u: 12 })
    expect(rackAt(p, centreOfU(p, 'r1', 1), 1)).toEqual({ rackId: 'r1', u: 1 })
  })

  it('2ᵉ baie : son propre numéro d’U', () => {
    const p = twoRacks()
    expect(rackAt(p, centreOfU(p, 'r2', 2), 1)).toEqual({ rackId: 'r2', u: 2 })
  })

  it('hors baie → null (à gauche, dans le titre, sous la baie, entre deux baies)', () => {
    const p = twoRacks()
    const r = box(p, 'r1')
    expect(rackAt(p, { x: r.x - 1, y: r.y + 200 }, 1)).toBeNull()
    expect(rackAt(p, { x: r.x + 100, y: r.y + RACK_TITLE_H / 2 }, 1)).toBeNull()
    expect(rackAt(p, { x: r.x + 100, y: r.y + r.h + 1 }, 1)).toBeNull()
    expect(rackAt(p, { x: r.x + r.w + RACK_GAP / 2, y: r.y + 200 }, 1)).toBeNull()
  })

  it('appareil 2U pointé en U12 d’une 12U → u 11 (le haut reste dans la baie)', () => {
    const p = rackSample()
    expect(rackAt(p, centreOfU(p, 'r1', 12), 2)).toEqual({ rackId: 'r1', u: 11 })
    expect(rackAt(p, centreOfU(p, 'r1', 5), 2)).toEqual({ rackId: 'r1', u: 5 })
  })
})
