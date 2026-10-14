import { describe, expect, it } from 'vitest'
import { sampleProject } from './__fixtures__/sample'
import { linkPoe, linkVlanView, setLinkVlan, switchPoeUsage, vlanEnds } from './derive'
import { createDevice } from './project'
import type { Project } from './types'

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
