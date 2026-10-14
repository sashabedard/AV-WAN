import { describe, expect, it } from 'vitest'
import { DEFAULT_PROJECT_VLAN_IDS, VLAN_PRESETS, vlanPreset } from './vlanPresets'
import { VlanSchema } from '../model/schema'
import { PAPER, contrastRatio } from '../theme/contrast'

describe('VLAN_PRESETS', () => {
  it('contient 10 VLAN aux identifiants uniques et valides', () => {
    expect(VLAN_PRESETS).toHaveLength(10)
    expect(new Set(VLAN_PRESETS.map((v) => v.id)).size).toBe(10)
    for (const v of VLAN_PRESETS) expect(VlanSchema.safeParse(v).success).toBe(true)
  })

  it('garde un contraste ≥ 3:1 sur le papier, dans les deux thèmes', () => {
    for (const v of VLAN_PRESETS) {
      expect(contrastRatio(v.color.dark, PAPER.dark), `${v.name} sombre`).toBeGreaterThanOrEqual(3)
      expect(contrastRatio(v.color.light, PAPER.light), `${v.name} clair`).toBeGreaterThanOrEqual(3)
    }
  })

  it('expose les VLAN par défaut et en renvoie des copies indépendantes', () => {
    for (const id of DEFAULT_PROJECT_VLAN_IDS) expect(vlanPreset(id).id).toBe(id)
    const a = vlanPreset(30)
    a.name = 'modifié'
    expect(vlanPreset(30).name).toBe('Dante A')
    expect(() => vlanPreset(12)).toThrow('Preset VLAN inconnu')
  })

  it('applique le profil ProAV Dante aux deux réseaux Dante', () => {
    expect(vlanPreset(30).unifi).toMatchObject({ igmpSnooping: true, querier: true, forwardUnknownMulticast: 'router-ports', proAvProfile: 'Dante Audio' })
    expect(vlanPreset(31).dhcp?.enabled).toBe(false)
  })
})
