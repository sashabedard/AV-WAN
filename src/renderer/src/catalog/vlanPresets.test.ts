import { describe, expect, it } from 'vitest'
import { DEFAULT_PROJECT_VLAN_IDS, VLAN_PRESETS, vlanFromPreset, vlanPreset } from './vlanPresets'
import { VlanSchema } from '../model/schema'
import { PAPER, contrastRatio } from '../theme/contrast'

describe('VLAN_PRESETS', () => {
  it('contient 10 VLAN aux identifiants uniques et valides', () => {
    expect(VLAN_PRESETS).toHaveLength(10)
    expect(new Set(VLAN_PRESETS.map((v) => v.id)).size).toBe(10)
    for (const v of VLAN_PRESETS) expect(VlanSchema.safeParse(vlanFromPreset(v, 'fr')).success).toBe(true)
  })

  it('garde un contraste ≥ 3:1 sur le papier, dans les deux thèmes', () => {
    for (const v of VLAN_PRESETS) {
      expect(contrastRatio(v.color.dark, PAPER.dark), `${v.name.fr} sombre`).toBeGreaterThanOrEqual(3)
      expect(contrastRatio(v.color.light, PAPER.light), `${v.name.fr} clair`).toBeGreaterThanOrEqual(3)
    }
  })

  it('expose les VLAN par défaut et en renvoie des copies indépendantes', () => {
    for (const id of DEFAULT_PROJECT_VLAN_IDS) expect(vlanPreset(id, 'fr').id).toBe(id)
    const a = vlanPreset(30, 'fr')
    a.name = 'modifié'
    expect(vlanPreset(30, 'fr').name).toBe('Dante A')
    expect(() => vlanPreset(12, 'fr')).toThrow('Preset VLAN inconnu')
  })

  it('applique le profil ProAV Dante aux deux réseaux Dante', () => {
    expect(vlanPreset(30, 'fr').unifi).toMatchObject({ igmpSnooping: true, querier: true, forwardUnknownMulticast: 'router-ports', proAvProfile: 'Dante Audio' })
    expect(vlanPreset(31, 'fr').dhcp?.enabled).toBe(false)
  })

  it('copie le VLAN prédéfini dans la langue de l’interface', () => {
    expect(vlanFromPreset(VLAN_PRESETS.find((p) => p.id === 50)!, 'en').name).toBe('Lighting')
    expect(vlanFromPreset(VLAN_PRESETS.find((p) => p.id === 50)!, 'fr').name).toBe('Éclairage')
  })
})
