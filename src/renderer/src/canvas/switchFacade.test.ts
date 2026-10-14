import { describe, expect, it } from 'vitest'
import { switchFacade } from './switchFacade'
import { buildSwitchPorts } from '../catalog/switch'

describe('switchFacade', () => {
  it('8 ports + 2 SFP+ : une rangée, SFP+ à droite des RJ45', () => {
    const f = switchFacade(buildSwitchPorts({ portCount: 8, poe: 'at', sfpPlus: 2, managed: true }))
    expect(f.twoRows).toBe(false)
    expect(f.height).toBe(66)
    expect(f.ports.filter((p) => p.kind === 'rj45').every((p) => p.y === 34 && p.row === 'bottom')).toBe(true)
    const lastRj = f.ports.find((p) => p.id === '8')!
    const s1 = f.ports.find((p) => p.id === 'SFP+1')!
    expect(s1.x).toBeGreaterThan(lastRj.x + lastRj.w)
    expect(f.width).toBe(s1.x + 2 * 22 + 22 + 12)
  })

  it('24 ports : deux rangées, 1 au-dessus de 2 dans la même colonne', () => {
    const f = switchFacade(buildSwitchPorts({ portCount: 24, poe: 'none', sfpPlus: 4, managed: true }))
    const p1 = f.ports.find((p) => p.id === '1')!
    const p2 = f.ports.find((p) => p.id === '2')!
    expect(f.twoRows).toBe(true)
    expect(f.height).toBe(92)
    expect(p1).toMatchObject({ row: 'top', y: 40 })
    expect(p2).toMatchObject({ row: 'bottom', y: 62, x: p1.x })
  })

  it('48 ports occupent 24 colonnes', () => {
    const f = switchFacade(buildSwitchPorts({ portCount: 48, poe: 'at', sfpPlus: 4, managed: true }))
    const xs = new Set(f.ports.filter((p) => p.kind === 'rj45').map((p) => p.x))
    expect(xs.size).toBe(24)
  })
})
