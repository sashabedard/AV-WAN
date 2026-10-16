import { describe, expect, it } from 'vitest'
import { POE_CHAR_W, TAPE_X, facadeExit, facadeLabels, switchFacade } from './switchFacade'
import { SWITCH_PORT_COUNTS, buildSwitchPorts, defaultPoeBudget, switchSummary } from '../catalog/switch'
import { messages } from '../../../shared/i18n/messages'
import { patchPanelPorts } from '../catalog/ports'

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

  it('panneau de brassage : A1 au-dessus de R1, 24 colonnes', () => {
    const f = switchFacade(patchPanelPorts(24))
    const a1 = f.ports.find((p) => p.id === 'A1')!
    const r1 = f.ports.find((p) => p.id === 'R1')!
    expect(f.twoRows).toBe(true)
    expect(a1).toMatchObject({ row: 'top', y: 40 })
    expect(r1).toMatchObject({ row: 'bottom', y: 62, x: a1.x })
    expect(new Set(f.ports.map((p) => p.x)).size).toBe(24)
  })
})

describe('facadeExit', () => {
  it('compte la distance jusqu’au bord de la façade par où sort le cordon', () => {
    const one = switchFacade(buildSwitchPorts({ portCount: 8, poe: 'at', sfpPlus: 2, managed: true }))
    expect(facadeExit(one, one.ports.find((p) => p.id === '1')!)).toBe(20)
    const two = switchFacade(patchPanelPorts(24))
    expect(facadeExit(two, two.ports.find((p) => p.id === 'A1')!)).toBe(40)
    expect(facadeExit(two, two.ports.find((p) => p.id === 'R1')!)).toBe(92 - (62 + 12))
  })
})

describe('facadeLabels', () => {
  it('garde le titre complet et l’indicateur PoE quand ils tiennent', () => {
    expect(facadeLabels('SW-1', '8×PoE+ · 2×SFP+', 292, { usedW: 25, budgetW: 120 })).toMatchObject({ tape: 'SW-1 · 8×PoE+ · 2×SFP+', poe: 'PoE 25 / 120 W' })
  })

  it('façade étroite : nom seul, puis indicateur raccourci et nom tronqué', () => {
    expect(facadeLabels('SW-1', '4×PoE+', 154, { usedW: 25, budgetW: 60 })).toMatchObject({ tape: 'SW-1', poe: 'PoE 25 / 60 W' })
    expect(facadeLabels('SW-REGIE-PRINCIPAL', '4×PoE+', 154, { usedW: 25, budgetW: 60 })).toMatchObject({ tape: 'SW-REGIE…', poe: '25/60 W' })
    expect(facadeLabels('PP-1', 'Panneau de brassage 24', 554).poe).toBeUndefined()
  })

  it('ne chevauche jamais l’indicateur PoE, pour toutes les tailles de switch', () => {
    for (const portCount of SWITCH_PORT_COUNTS) {
      for (const sfpPlus of [0, 2, 4] as const) {
        const spec = { portCount, poe: 'bt' as const, sfpPlus, managed: true }
        const width = switchFacade(buildSwitchPorts(spec)).width
        const labels = facadeLabels('SW-12', switchSummary(spec, messages('fr')), width, { usedW: 999.9, budgetW: defaultPoeBudget(portCount, 'bt')! })
        const poeWidth = labels.poe ? labels.poe.length * POE_CHAR_W + 10 : 0
        expect(TAPE_X + labels.tapeWidth, `${portCount} ports, ${sfpPlus} SFP+`).toBeLessThanOrEqual(width - 22 - poeWidth + 0.5)
      }
    }
  })
})
