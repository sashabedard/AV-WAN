// src/renderer/src/reports/ipPlan.test.ts
import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { sampleProject } from '../model/__fixtures__/sample'
import { createDevice } from '../model/project'
import { ipPlan } from './ipPlan'
import { withPrimaryIp } from '../model/ips'

describe('ipPlan', () => {
  const p = createExampleProject(new Date(2026, 9, 13), 'fr')

  it('trie par VLAN, puis par adresse (spec § 11.1, section 6)', () => {
    const t = ipPlan(p, 'fr')
    expect(t).toMatchObject({ id: 'plan-ip', title: 'Plan d’adressage IP' })
    expect(t.columns.map((c) => c.label)).toEqual(['Appareil', 'Interface', 'Adresse IP', 'Mode', 'VLAN', 'Nom d’hôte'])
    expect(t.rows.map((r) => r[0])).toEqual([
      'GW-1', 'SW-1', 'SW-2', 'AP-1', 'MAC-1', 'DNT-1', 'SPK-1', 'SPK-2', 'PC-1',
      'CAM-1', 'CAM-2', 'LX-1', 'PIX-1', 'DMX-1', 'MQT-1', 'IOT-1', 'IOT-2'
    ])
  })

  it('donne l’interface, le mode, le VLAN et le nom d’hôte', () => {
    const row = (name: string) => ipPlan(p, 'fr').rows.find((r) => r[0] === name)
    expect(row('SW-2')).toEqual(['SW-2', '1', '10.10.10.3', 'Statique', '10 Gestion', ''])
    expect(row('MAC-1')).toEqual(['MAC-1', 'ETH', '10.20.0.10', 'Statique', '20 Contrôle / OSC', 'regie-qlab'])
    expect(row('SPK-1')).toEqual(['SPK-1', 'ETH', '—', 'DHCP', '30 Dante A', ''])
    expect(row('IOT-2')).toEqual(['IOT-2', 'Wi-Fi', '—', 'DHCP', '60 IoT / MQTT', ''])
  })

  it('liste aussi l’adresse d’un port (seconde interface), avec son VLAN', () => {
    const q = sampleProject()
    q.devices[1]!.portState['ETH'] = { ips: [{ address: '10.40.0.21', mode: 'static' }, { address: '10.40.0.99', mode: 'static' }] }
    expect(ipPlan(q, 'fr').rows).toEqual([
      ['CAM-1', 'ETH', '10.40.0.21', 'Statique', '40 NDI', ''],
      ['CAM-1', 'ETH', '10.40.0.99', 'Statique', '40 NDI', '']
    ])
  })

  it('range une adresse invalide après les valides, et un appareil sans VLAN à la fin', () => {
    const q = sampleProject()
    q.devices[1]!.portState['ETH'] = { ips: [{ address: 'à définir', mode: 'static' }, { address: '10.40.0.9', mode: 'static' }] }
    const gen = withPrimaryIp(createDevice(q, 'generic', { x: 0, y: 400 }, { lang: 'fr', id: 'gen' }), { address: '10.0.0.1', mode: 'static' })
    q.devices.push(gen)
    expect(ipPlan(q, 'fr').rows.map((r) => [r[0], r[1], r[2], r[4]])).toEqual([
      ['CAM-1', 'ETH', '10.40.0.9', '40 NDI'],
      ['CAM-1', 'ETH', 'à définir', '40 NDI'],
      ['GEN-1', 'ETH', '10.0.0.1', '—']
    ])
  })
})

describe('ipPlan — IP multiples', () => {
  it('un port à 2 IP donne 2 lignes ; le nom d’hôte est sur la ligne principale seulement', () => {
    const q = sampleProject()
    q.devices[1]!.hostname = 'cam-1'
    q.devices[1]!.portState['ETH'] = { ips: [{ address: '10.40.0.21', mode: 'static' }, { address: '10.40.0.22', mode: 'static' }] }
    expect(ipPlan(q, 'fr').rows).toEqual([
      ['CAM-1', 'ETH', '10.40.0.21', 'Statique', '40 NDI', 'cam-1'],
      ['CAM-1', 'ETH', '10.40.0.22', 'Statique', '40 NDI', '']
    ])
  })
})

describe('ipPlan — VMs et cartes', () => {
  function hv() {
    const q = sampleProject()
    const host = { ...createDevice(q, 'media-server', { x: 0, y: 400 }, { lang: 'fr', id: 'hv' }), name: 'SRV-HV-01' }
    host.cards = [{ id: 'k', name: 'Carte réseau 1' }]
    host.ports = [...host.ports, { id: 'eth2', label: 'eth2', connector: 'rj45' as const, cardId: 'k' }]
    host.portState = { eth2: { ips: [{ address: '10.80.0.2', mode: 'static' }] } }
    q.devices.push(host)
    q.links.push({ id: 'l9', cableId: 'C-009', a: { deviceId: 'sw1', portId: '2' }, b: { deviceId: 'hv', portId: 'ETH1' }, medium: 'cat6' })
    q.devices[0]!.portState['2'] = { mode: 'access', nativeVlan: 40 }
    q.vms = [{ id: 'vm', hostId: 'hv', name: 'VM Show', hostname: 'show-01', vnics: [{ id: 'n', label: 'vnic0', bridgePortId: 'ETH1', ips: [{ address: '10.40.0.32', mode: 'static' }, { address: '10.40.0.33', mode: 'static' }] }] }]
    return q
  }

  it('une VM à 2 IP sur vnic0 donne 2 lignes « hôte › VM », VLAN du pont, nom d’hôte sur la 1ʳᵉ', () => {
    const rows = ipPlan(hv(), 'fr').rows.filter((r) => String(r[0]).includes('›'))
    expect(rows).toEqual([
      ['SRV-HV-01 › VM Show', 'vnic0', '10.40.0.32', 'Statique', '40 NDI', 'show-01'],
      ['SRV-HV-01 › VM Show', 'vnic0', '10.40.0.33', 'Statique', '40 NDI', '']
    ])
  })

  it('un port d’une carte (hors « Intégré ») est préfixé du nom de la carte', () => {
    expect(ipPlan(hv(), 'fr').rows.find((r) => r[2] === '10.80.0.2')!.slice(0, 2)).toEqual(['SRV-HV-01', 'Carte réseau 1 › eth2'])
  })
})

describe('ipPlan en anglais', () => {
  it('écrit le plan d’adressage en anglais', () => {
    const t = ipPlan(createExampleProject(new Date(2026, 9, 13), 'en'), 'en')
    expect([t.id, t.title]).toEqual(['ip-plan', 'IP addressing plan'])
    expect(t.columns.map((c) => c.label)).toEqual(['Device', 'Interface', 'IP address', 'Mode', 'VLAN', 'Hostname'])
    expect(t.rows.find((r) => r[0] === 'SW-2')).toEqual(['SW-2', '1', '10.10.10.3', 'Static', '10 Management', ''])
  })
})
