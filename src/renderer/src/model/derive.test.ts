import { describe, expect, it } from 'vitest'
import { sampleProject } from './__fixtures__/sample'
import { linkPoe, linkVlanIds, linkVlanView, setLinkVlan, switchPoeUsage, vlanEnds, vlanMembers } from './derive'
import { VLAN_PRESETS } from '../catalog/vlanPresets'
import { createDevice } from './project'
import type { Project } from './types'
import { passThroughPeer } from './rules'

describe('linkVlanView / setLinkVlan', () => {
  it('lit le VLAN sur le port côté switch', () => {
    const p = sampleProject()
    expect(linkVlanView(p, p.links[0]!)).toEqual({ kind: 'access', vlan: 40 })
  })

  it('écrit un trunk sur le port du switch et conserve les autres réglages', () => {
    const p0 = sampleProject()
    p0.devices[0]!.portState['1'] = { mode: 'access', nativeVlan: 40, poeEnabled: false }
    const p = setLinkVlan(p0, 'l1', { kind: 'trunk', native: 10, tagged: [40, 60] })
    expect(p.devices[0]!.portState['1']).toEqual({ mode: 'trunk', nativeVlan: 10, taggedVlans: [40, 60], poeEnabled: false })
    expect(p.devices[1]).toBe(p0.devices[1]) // la caméra n'est pas touchée
  })

  it('efface le VLAN avec « none »', () => {
    const p = setLinkVlan(sampleProject(), 'l1', { kind: 'none' })
    expect(p.devices[0]!.portState['1']).toEqual({})
    expect(linkVlanView(p, p.links[0]!)).toEqual({ kind: 'none' })
  })

  it("n'a pas de VLAN pour un lien hors réseau", () => {
    const p = sampleProject()
    const link = { ...p.links[0]!, medium: 'hdmi' as const }
    expect(vlanEnds(p, link)).toEqual([])
    expect(linkVlanView(p, link)).toEqual({ kind: 'none' })
  })

  it("en Wi-Fi, stocke le VLAN côté client (un SSID par client), pas sur la radio du point d'accès", () => {
    let p: Project = sampleProject()
    p = { ...p, devices: [...p.devices, createDevice(p, 'ap', { x: 0, y: 0 }, { id: 'ap' }), createDevice(p, 'esp32-devkit', { x: 0, y: 0 }, { id: 'esp' })] }
    p = { ...p, links: [...p.links, { id: 'w', cableId: 'C-002', a: { deviceId: 'ap', portId: 'WIFI' }, b: { deviceId: 'esp', portId: 'WIFI' }, medium: 'wifi' }] }
    expect(vlanEnds(p, p.links[1]!)).toEqual([{ deviceId: 'esp', portId: 'WIFI' }])
    const q = setLinkVlan(p, 'w', { kind: 'access', vlan: 60 })
    expect(q.devices.find((d) => d.id === 'esp')!.portState['WIFI']).toEqual({ mode: 'access', nativeVlan: 60 })
  })
})

describe('linkPoe / switchPoeUsage', () => {
  it('détecte le PoE et additionne la consommation', () => {
    const p = sampleProject()
    expect(linkPoe(p, p.links[0]!)).toEqual({ active: true, cls: 'at', drawW: 25, pse: { deviceId: 'sw1', portId: '1' }, pd: { deviceId: 'cam1', portId: 'ETH' } })
    expect(switchPoeUsage(p, 'sw1')).toEqual({ usedW: 25, budgetW: 60 })
  })

  it('respecte un port dont le PoE est coupé', () => {
    const p = sampleProject()
    p.devices[0]!.portState['1'] = { ...p.devices[0]!.portState['1'], poeEnabled: false }
    expect(linkPoe(p, p.links[0]!).active).toBe(false)
    expect(switchPoeUsage(p, 'sw1').usedW).toBe(0)
  })

  it('prend la classe la plus basse des deux bouts', () => {
    const p = sampleProject()
    p.devices[1]!.ports[0]!.poeIn = 'af'
    expect(linkPoe(p, p.links[0]!).cls).toBe('af')
  })
})

describe('linkVlanIds et vlanMembers', () => {
  it('donne les VLAN d’un câble : accès, trunk explicite, trunk « tous », aucun', () => {
    const p = { ...sampleProject(), vlans: [...VLAN_PRESETS] }
    const l = p.links[0]!
    expect(linkVlanIds(p, l)).toEqual([40])
    p.devices[0]!.portState['1'] = { mode: 'trunk', nativeVlan: 10, taggedVlans: [40, 30, 40] }
    expect(linkVlanIds(p, l)).toEqual([10, 30, 40])
    p.devices[0]!.portState['1'] = { mode: 'trunk', taggedVlans: 'all' }
    expect(linkVlanIds(p, l)).toEqual(VLAN_PRESETS.map((v) => v.id))
    p.devices[0]!.portState['1'] = {}
    expect(linkVlanIds(p, l)).toEqual([])
  })

  it('liste les appareils et câbles membres d’un VLAN', () => {
    const p = sampleProject()
    expect(vlanMembers(p, 40)).toEqual({ deviceIds: ['sw1', 'cam1'], linkIds: ['l1'] })
    expect(vlanMembers(p, 30)).toEqual({ deviceIds: [], linkIds: [] })
  })
})

describe('VLAN de passage par un panneau de brassage', () => {
  // SW-1 port 1 → PP-1 A1 (l1) ; PP-1 R1 → caméra (l2). Le port 1 du switch est en accès VLAN 40.
  function withPanel(): Project {
    const p: Project = sampleProject()
    const pp = createDevice(p, 'patch-panel-24', { x: 0, y: 100 }, { id: 'pp' })
    return {
      ...p,
      devices: [...p.devices, pp],
      links: [
        { id: 'l1', cableId: 'C-001', a: { deviceId: 'sw1', portId: '1' }, b: { deviceId: 'pp', portId: 'A1' }, medium: 'cat6' },
        { id: 'l2', cableId: 'C-002', a: { deviceId: 'pp', portId: 'R1' }, b: { deviceId: 'cam1', portId: 'ETH' }, medium: 'cat6' }
      ]
    }
  }

  it('lit le VLAN du port de switch en amont du panneau', () => {
    const p = withPanel()
    expect(vlanEnds(p, p.links[1]!)).toEqual([{ deviceId: 'sw1', portId: '1' }])
    expect(linkVlanView(p, p.links[1]!)).toEqual({ kind: 'access', vlan: 40 })
    expect(vlanMembers(p, 40).deviceIds).toEqual(['sw1', 'cam1', 'pp'])
  })

  it('écrit le réglage sur ce port de switch : les deux câbles changent ensemble', () => {
    const p = setLinkVlan(withPanel(), 'l2', { kind: 'access', vlan: 10 })
    expect(p.devices.find((d) => d.id === 'sw1')!.portState['1']).toEqual({ mode: 'access', nativeVlan: 10 })
    expect(linkVlanView(p, p.links[0]!)).toEqual({ kind: 'access', vlan: 10 })
    expect(p.devices.find((d) => d.id === 'pp')!.portState).toEqual({})
  })

  it('reste sans VLAN quand rien n’est branché en face', () => {
    const p = withPanel()
    const q = { ...p, links: [p.links[1]!] }
    expect(vlanEnds(q, q.links[0]!)).toEqual([])
    expect(linkVlanView(q, q.links[0]!)).toEqual({ kind: 'none' })
  })

  it('traverse deux panneaux à la suite et ne boucle jamais', () => {
    let p: Project = withPanel()
    const pp2 = createDevice(p, 'patch-panel-24', { x: 0, y: 200 }, { id: 'pp2' })
    // SW-1:1 → PP-1:A1 ; PP-1:R1 → PP-2:A1 ; PP-2:R1 → caméra.
    p = {
      ...p,
      devices: [...p.devices, pp2],
      links: [
        p.links[0]!,
        { id: 'l2', cableId: 'C-002', a: { deviceId: 'pp', portId: 'R1' }, b: { deviceId: 'pp2', portId: 'A1' }, medium: 'cat6' },
        { id: 'l3', cableId: 'C-003', a: { deviceId: 'pp2', portId: 'R1' }, b: { deviceId: 'cam1', portId: 'ETH' }, medium: 'cat6' }
      ]
    }
    expect(linkVlanView(p, p.links[2]!)).toEqual({ kind: 'access', vlan: 40 })
    // Boucle fermée entre deux panneaux, sans switch : aucune extrémité, et le calcul se termine.
    const loop: Project = {
      ...p,
      links: [
        { id: 'x1', cableId: 'C-010', a: { deviceId: 'pp', portId: 'R2' }, b: { deviceId: 'pp2', portId: 'A2' }, medium: 'cat6' },
        { id: 'x2', cableId: 'C-011', a: { deviceId: 'pp2', portId: 'R2' }, b: { deviceId: 'pp', portId: 'A2' }, medium: 'cat6' }
      ]
    }
    expect(vlanEnds(loop, loop.links[0]!)).toEqual([])
  })

  it('n’ouvre aucun passage hors d’un panneau de brassage', () => {
    const p = sampleProject()
    expect(passThroughPeer(p.devices[0]!, '1')).toBeUndefined()
    const pp = createDevice(p, 'patch-panel-24', { x: 0, y: 0 })
    expect(passThroughPeer(pp, 'A7')).toBe('R7')
    expect(passThroughPeer(pp, 'R24')).toBe('A24')
    expect(passThroughPeer(pp, 'A25')).toBeUndefined()
  })
})
