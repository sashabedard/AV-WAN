import { describe, expect, it } from 'vitest'
import { MEDIUM_KIND_ORDER, NEUTRAL, TRUNK, TYPE_COLORS, cordStyle, mediumKind } from './cordStyle'
import { contrastRatio, PAPER } from '../theme/contrast'
import { sampleProject } from '../model/__fixtures__/sample'
import { VLAN_PRESETS, vlanFromPreset } from '../catalog/vlanPresets'

describe('cordStyle', () => {
  it("prend la couleur du VLAN d'accès selon le thème", () => {
    const p = sampleProject()
    expect(cordStyle(p, p.links[0]!, 'dark')).toEqual({ color: '#3E8EF7', width: 4.5, innerDash: false, bands: [], extraBands: 0, straight: false, plugs: true, alwaysTag: false })
    expect(cordStyle(p, p.links[0]!, 'light').color).toBe('#2563C9')
  })

  it('dessine un trunk en cordon neutre avec des bagues (6 au maximum)', () => {
    const p = { ...sampleProject(), vlans: VLAN_PRESETS.map((v) => vlanFromPreset(v, 'fr')) }
    p.devices[0]!.portState['1'] = { mode: 'trunk', taggedVlans: [40] }
    expect(cordStyle(p, p.links[0]!, 'dark')).toMatchObject({ color: TRUNK.dark, bands: ['#3E8EF7'], extraBands: 0 })
    p.devices[0]!.portState['1'] = { mode: 'trunk', taggedVlans: 'all' }
    const all = cordStyle(p, p.links[0]!, 'light')
    expect(all.bands).toHaveLength(6)
    expect(all.extraBands).toBe(4)
  })

  it('reste neutre sans VLAN ou avec un VLAN inconnu', () => {
    const p = sampleProject()
    p.devices[0]!.portState['1'] = { mode: 'access', nativeVlan: 77 }
    expect(cordStyle(p, p.links[0]!, 'dark').color).toBe(NEUTRAL.dark)
  })

  it('encode le médium par le trait', () => {
    const p = sampleProject()
    const l = p.links[0]!
    expect(cordStyle(p, { ...l, medium: 'om4' }, 'dark')).toMatchObject({ width: 3.2, innerDash: true, plugs: true })
    expect(cordStyle(p, { ...l, medium: 'wifi' }, 'dark')).toMatchObject({ width: 2, straight: true, plugs: false, dash: '1.5 5' })
    expect(cordStyle(p, { ...l, medium: 'hdmi' }, 'dark')).toMatchObject({ width: 2, dash: '8 5', badge: 'HDMI', color: NEUTRAL.dark })
  })

  it('mode Type : la couleur suit le médium, sans bagues', () => {
    const p = { ...sampleProject(), vlans: VLAN_PRESETS.map((v) => vlanFromPreset(v, 'fr')) }
    p.settings = { ...p.settings, colorMode: 'type' }
    p.devices[0]!.portState['1'] = { mode: 'trunk', taggedVlans: 'all' }
    const l = p.links[0]!
    expect(cordStyle(p, l, 'dark')).toMatchObject({ color: TYPE_COLORS.copper.dark, bands: [], extraBands: 0, alwaysTag: false })
    expect(cordStyle(p, { ...l, medium: 'om4' }, 'light').color).toBe(TYPE_COLORS.multimode.light)
    expect(cordStyle(p, { ...l, medium: 'os2' }, 'light').color).toBe(TYPE_COLORS.singlemode.light)
    expect(cordStyle(p, { ...l, medium: 'dmx' }, 'dark').color).toBe(TYPE_COLORS.simple.dark)
  })

  it('mode Port : câbles neutres et étiquettes toujours affichées', () => {
    const p = sampleProject()
    p.settings = { ...p.settings, colorMode: 'port' }
    expect(cordStyle(p, p.links[0]!, 'dark')).toMatchObject({ color: NEUTRAL.dark, bands: [], alwaysTag: true })
  })

  it('les couleurs du mode Type contrastent d’au moins 3:1 avec le papier', () => {
    for (const kind of MEDIUM_KIND_ORDER) {
      for (const theme of ['dark', 'light'] as const) {
        expect(contrastRatio(TYPE_COLORS[kind][theme], PAPER[theme]), `${kind} ${theme}`).toBeGreaterThanOrEqual(3)
      }
    }
  })
})

it('dessine un câble « Alim DC » comme un lien simple, pastille DC', () => {
  const p = sampleProject()
  const link = { ...p.links[0]!, medium: 'dc' as const }
  const s = cordStyle(p, link, 'dark')
  expect(s.badge).toBe('DC')
  expect(s.plugs).toBe(false)
  expect(mediumKind('dc')).toBe('simple')
})
