import { describe, expect, it } from 'vitest'
import { NEUTRAL, TRUNK, cordStyle } from './cordStyle'
import { sampleProject } from '../model/__fixtures__/sample'
import { VLAN_PRESETS } from '../catalog/vlanPresets'

describe('cordStyle', () => {
  it("prend la couleur du VLAN d'accès selon le thème", () => {
    const p = sampleProject()
    expect(cordStyle(p, p.links[0]!, 'dark')).toEqual({ color: '#3E8EF7', width: 4.5, innerDash: false, bands: [], extraBands: 0, straight: false, plugs: true })
    expect(cordStyle(p, p.links[0]!, 'light').color).toBe('#2563C9')
  })

  it('dessine un trunk en cordon neutre avec des bagues (6 au maximum)', () => {
    const p = { ...sampleProject(), vlans: [...VLAN_PRESETS] }
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
})
