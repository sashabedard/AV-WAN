import { describe, expect, it } from 'vitest'
import { TEMPLATES } from './templates'
import { BUILTIN_ICON_NAMES } from './iconNames'
import { CATEGORY_ORDER } from './categories'
import { buildSwitchPorts, defaultPoeBudget, switchSummary } from './switch'
import { getTemplate } from './index'
import { DeviceTemplateSchema } from '../model/schema'

describe('TEMPLATES', () => {
  it('a des identifiants uniques, des gabarits valides et des icônes connues', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length)
    expect(TEMPLATES.length).toBe(88)
    for (const t of TEMPLATES) {
      expect(DeviceTemplateSchema.safeParse(t).success, t.id).toBe(true)
      expect(t.icon.kind === 'builtin' && (BUILTIN_ICON_NAMES as readonly string[]).includes(t.icon.name), t.id).toBe(true)
      expect(CATEGORY_ORDER).toContain(t.category)
    }
  })

  it('donne des génériques d’éclairage patchables, entrée et recopie DMX', () => {
    const ids = ['moving-spot', 'moving-wash', 'moving-beam', 'par-led', 'led-batten', 'profile-led', 'strobe', 'hazer', 'fog-machine']
    for (const id of ids) {
      const t = TEMPLATES.find((x) => x.id === id)!
      expect(t.category, id).toBe('eclairage')
      expect(t.dmx?.footprint, id).toBeGreaterThan(0)
      expect(t.ports.map((p) => p.id), id).toEqual(['DMX-IN', 'DMX-OUT'])
      expect(t.powerW, id).toBeUndefined() // un générique n’invente pas de watts
    }
  })

  it('décrit le switch par une spec et non par des ports fixes', () => {
    const sw = TEMPLATES.find((t) => t.id === 'switch')!
    expect(sw.ports).toEqual([])
    expect(sw.switch).toEqual({ portCount: 8, poe: 'at', sfpPlus: 2, managed: true })
  })

  it("ne met pas de PoE sur le contrôleur de pixels (alimenté en DC)", () => {
    const pix = TEMPLATES.find((t) => t.id === 'pixel-controller')!
    expect(pix.ports.some((p) => p.poeIn)).toBe(false)
    expect(pix.ports.filter((p) => p.connector === 'pixel')).toHaveLength(4)
  })
})

describe('buildSwitchPorts', () => {
  it('8 ports PoE+ et 2 SFP+ sur une rangée', () => {
    const ports = buildSwitchPorts({ portCount: 8, poe: 'at', sfpPlus: 2, managed: true })
    expect(ports).toHaveLength(10)
    expect(ports.slice(0, 8).every((p) => p.connector === 'rj45' && p.poeOut === 'at' && p.row === 'bottom')).toBe(true)
    expect(ports[8]).toMatchObject({ id: 'SFP+1', label: 'S1', connector: 'sfp+', row: 'bottom' })
  })

  it('24 ports sur deux rangées : impairs en haut, pairs en bas', () => {
    const ports = buildSwitchPorts({ portCount: 24, poe: 'none', sfpPlus: 2, managed: true })
    expect(ports.find((p) => p.id === '1')?.row).toBe('top')
    expect(ports.find((p) => p.id === '2')?.row).toBe('bottom')
    expect(ports.find((p) => p.id === 'SFP+1')?.row).toBe('top')
    expect(ports.some((p) => p.poeOut)).toBe(false)
  })
})

describe('defaultPoeBudget et switchSummary', () => {
  it('suit la table de la spec', () => {
    expect(defaultPoeBudget(5, 'af')).toBe(30)
    expect(defaultPoeBudget(8, 'at')).toBe(120)
    expect(defaultPoeBudget(16, 'bt')).toBe(360)
    expect(defaultPoeBudget(24, 'at')).toBe(400)
    expect(defaultPoeBudget(48, 'bt')).toBe(1000)
    expect(defaultPoeBudget(8, 'none')).toBeUndefined()
  })

  it('résume la configuration', () => {
    expect(switchSummary({ portCount: 8, poe: 'at', sfpPlus: 2, managed: true })).toBe('8×PoE+ · 2×SFP+')
    expect(switchSummary({ portCount: 5, poe: 'none', sfpPlus: 0, managed: false })).toBe('5 ports')
  })
})

describe('getTemplate', () => {
  it('préfère un gabarit perso au catalogue', () => {
    const custom = { ...TEMPLATES[1]!, name: 'Ma passerelle', isCustom: true }
    expect(getTemplate({ templates: [custom] }, custom.id)?.name).toBe('Ma passerelle')
    expect(getTemplate({ templates: [] }, 'ptz-ndi')?.code).toBe('CAM')
    expect(getTemplate({ templates: [] }, 'inconnu')).toBeUndefined()
  })

  it('décrit le panneau de brassage : 24 ports avant en haut, 24 arrière en bas, sans PoE', () => {
    const pp = TEMPLATES.find((t) => t.id === 'patch-panel-24')!
    expect(pp).toMatchObject({ category: 'reseau', code: 'PP', icon: { kind: 'builtin', name: 'patch-panel' } })
    expect(pp.ports).toHaveLength(48)
    expect(pp.ports[0]).toMatchObject({ id: 'A1', label: 'A1', connector: 'rj45', row: 'top' })
    expect(pp.ports[24]).toMatchObject({ id: 'R1', label: 'R1', connector: 'rj45', row: 'bottom' })
    expect(pp.ports.some((p) => p.poeOut || p.poeIn)).toBe(false)
  })

  it('décrit l’alimentation : 4 sorties DC, 24 V, courant et puissance à taper', () => {
    const psu = TEMPLATES.find((t) => t.id === 'psu')!
    expect(psu).toMatchObject({ category: 'autre', code: 'PSU', name: 'Alimentation', icon: { kind: 'builtin', name: 'psu' }, psu: { volts: 24 } })
    expect(psu.ports.map((p) => [p.id, p.label, p.connector])).toEqual([
      ['DC-OUT-1', 'DC OUT 1', 'dc'],
      ['DC-OUT-2', 'DC OUT 2', 'dc'],
      ['DC-OUT-3', 'DC OUT 3', 'dc'],
      ['DC-OUT-4', 'DC OUT 4', 'dc']
    ])
  })

  it('donne à la bande LED une entrée de données, une entrée DC et 5 m de WS2812B', () => {
    const led = TEMPLATES.find((t) => t.id === 'led-strip')!
    expect(led.ports.map((p) => [p.id, p.connector])).toEqual([['IN', 'pixel'], ['DC-IN', 'dc']])
    expect(led.ledStrip).toMatchObject({ type: 'ws2812b', volts: 5, pxPerM: 60, lengthM: 5 })
  })
})
