// src/renderer/src/reports/vlanSheets.test.ts
import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { vlanSheets } from './vlanSheets'

const p = createExampleProject(new Date(2026, 9, 13))

describe('vlanSheets', () => {
  it('fait une fiche par VLAN, par numéro croissant', () => {
    expect(vlanSheets(p).map((s) => s.id)).toEqual([10, 20, 30, 40, 50, 60])
  })

  it('donne le réseau, les réglages UniFi sous leurs noms exacts, les membres et la note', () => {
    const ndi = vlanSheets(p).find((s) => s.id === 40)!
    expect(ndi).toMatchObject({ name: 'NDI', short: 'NDI', color: '#2563C9', cables: 5 })
    expect(ndi.network).toEqual([
      ['Sous-réseau', '10.40.0.0/23'],
      ['Passerelle', '10.40.0.1'],
      ['DHCP', 'Oui'],
      ['Accès Internet', 'Non']
    ])
    expect(ndi.unifi).toEqual([
      ['IGMP Snooping', 'Activé'],
      ['Create New Querier Switch', 'Activé'],
      ['Forward Unknown Multicast Traffic', 'Multicast Router Ports'],
      ['Flood Known Protocols', 'Activé'],
      ['Fast Leave', 'Activé'],
      ['mDNS Proxy', 'Off'],
      ['Network Isolation', 'Activé'],
      ['Profil de port ProAV', 'Aucun'],
      ['Jumbo Frames', 'Désactivé']
    ])
    expect(ndi.members).toEqual(['CAM-1', 'CAM-2', 'GW-1', 'PC-1', 'SW-1', 'SW-2'])
    expect(ndi.note).toBe('NDI recommande QoS et trames jumbo désactivées. Discovery Server : TCP 5959.')
  })

  it('cache les sous-réglages IGMP quand l’IGMP est coupé, comme l’inspecteur', () => {
    const mgmt = vlanSheets(p).find((s) => s.id === 10)!
    expect(mgmt.unifi.map(([k]) => k)).toEqual(['IGMP Snooping', 'mDNS Proxy', 'Network Isolation', 'Profil de port ProAV', 'Jumbo Frames'])
  })

  it('affiche la plage DHCP quand elle est connue', () => {
    const q = { ...p, vlans: p.vlans.map((v) => (v.id === 60 ? { ...v, dhcp: { enabled: true, range: '10.60.0.100-10.60.0.199' } } : v)) }
    expect(vlanSheets(q).find((s) => s.id === 60)!.network[2]).toEqual(['DHCP', 'Oui · 10.60.0.100-10.60.0.199'])
  })
})
