// src/renderer/src/reports/ipPlan.test.ts
import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { sampleProject } from '../model/__fixtures__/sample'
import { createDevice } from '../model/project'
import { ipPlan } from './ipPlan'

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
    expect(row('SW-2')).toEqual(['SW-2', 'Principale', '10.10.10.3', 'Statique', '10 Gestion', ''])
    expect(row('MAC-1')).toEqual(['MAC-1', 'Principale', '10.20.0.10', 'Statique', '20 Contrôle / OSC', 'regie-qlab'])
    expect(row('SPK-1')).toEqual(['SPK-1', 'Principale', '—', 'DHCP', '30 Dante A', ''])
    expect(row('IOT-2')).toEqual(['IOT-2', 'Principale', '—', 'DHCP', '60 IoT / MQTT', ''])
  })

  it('liste aussi l’adresse d’un port (seconde interface), avec son VLAN', () => {
    const q = sampleProject()
    q.devices[1]!.portState['ETH'] = { ip: { address: '10.40.0.99', mode: 'static' } }
    expect(ipPlan(q, 'fr').rows).toEqual([
      ['CAM-1', 'Principale', '10.40.0.21', 'Statique', '40 NDI', ''],
      ['CAM-1', 'ETH', '10.40.0.99', 'Statique', '40 NDI', '']
    ])
  })

  it('range une adresse invalide après les valides, et un appareil sans VLAN à la fin', () => {
    const q = sampleProject()
    q.devices[1]!.ip = { address: 'à définir', mode: 'static' }
    q.devices[1]!.portState['ETH'] = { ip: { address: '10.40.0.9', mode: 'static' } }
    const gen = { ...createDevice(q, 'generic', { x: 0, y: 400 }, { lang: 'fr', id: 'gen' }), ip: { address: '10.0.0.1', mode: 'static' as const } }
    q.devices.push(gen)
    expect(ipPlan(q, 'fr').rows.map((r) => [r[0], r[1], r[2], r[4]])).toEqual([
      ['CAM-1', 'ETH', '10.40.0.9', '40 NDI'],
      ['CAM-1', 'Principale', 'à définir', '40 NDI'],
      ['GEN-1', 'Principale', '10.0.0.1', '—']
    ])
  })
})

describe('ipPlan en anglais', () => {
  it('écrit le plan d’adressage en anglais', () => {
    const t = ipPlan(createExampleProject(new Date(2026, 9, 13), 'en'), 'en')
    expect([t.id, t.title]).toEqual(['ip-plan', 'IP addressing plan'])
    expect(t.columns.map((c) => c.label)).toEqual(['Device', 'Interface', 'IP address', 'Mode', 'VLAN', 'Hostname'])
    expect(t.rows.find((r) => r[0] === 'SW-2')).toEqual(['SW-2', 'Main', '10.10.10.3', 'Static', '10 Management', ''])
  })
})
