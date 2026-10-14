import { describe, expect, it } from 'vitest'
import { VLAN_BASE_UNIFI, addVlan, availablePresets, blankVlan, changeVlanId, removeVlan, updateVlan } from './vlans'
import { vlanPreset } from '../catalog/vlanPresets'
import { sampleProject } from './__fixtures__/sample'

describe('vlans', () => {
  it('propose un VLAN vide : premier numéro libre dès 100, couleur encore inutilisée, tout désactivé', () => {
    const v = blankVlan(sampleProject())
    expect(v).toMatchObject({ id: 100, name: 'VLAN 100', short: 'VLAN100', internet: false })
    expect(v.color.dark).not.toBe('#3E8EF7')
    expect(v.unifi).toEqual(VLAN_BASE_UNIFI)
  })

  it('liste les presets qui ne sont pas encore dans le projet', () => {
    expect(availablePresets(sampleProject()).map((v) => v.id)).toEqual([10, 20, 30, 31, 50, 60, 70, 80, 99])
  })

  it('ajoute un VLAN en gardant l’ordre des numéros, sans doublon', () => {
    const p = addVlan(sampleProject(), vlanPreset(10))
    expect(p.vlans.map((v) => v.id)).toEqual([10, 40])
    expect(addVlan(p, vlanPreset(10))).toBe(p)
  })

  it('modifie un VLAN', () => {
    expect(updateVlan(sampleProject(), 40, { name: 'Vidéo' }).vlans[0]!.name).toBe('Vidéo')
  })

  it('renumérote un VLAN et reporte le numéro sur tous les ports qui l’utilisent', () => {
    const p = sampleProject()
    p.devices[0]!.portState['2'] = { mode: 'trunk', nativeVlan: 40, taggedVlans: [40, 10] }
    const q = changeVlanId(p, 40, 41)!
    expect(q.vlans.map((v) => v.id)).toEqual([41])
    expect(q.devices[0]!.portState['1']).toEqual({ mode: 'access', nativeVlan: 41 })
    expect(q.devices[0]!.portState['2']).toEqual({ mode: 'trunk', nativeVlan: 41, taggedVlans: [10, 41] })
    expect(q.devices[1]).toBe(p.devices[1])
  })

  it('refuse un numéro pris, hors de 1 à 4094, ou un VLAN inconnu', () => {
    const p = addVlan(sampleProject(), vlanPreset(10))
    expect(changeVlanId(p, 40, 10)).toBeNull()
    expect(changeVlanId(p, 40, 0)).toBeNull()
    expect(changeVlanId(p, 40, 4095)).toBeNull()
    expect(changeVlanId(p, 40, 1.5)).toBeNull()
    expect(changeVlanId(p, 77, 78)).toBeNull()
    expect(changeVlanId(p, 40, 40)).toBe(p)
  })

  it('retire un VLAN sans toucher aux ports', () => {
    const q = removeVlan(sampleProject(), 40)
    expect(q.vlans).toEqual([])
    expect(q.devices[0]!.portState['1']).toEqual({ mode: 'access', nativeVlan: 40 })
  })
})
