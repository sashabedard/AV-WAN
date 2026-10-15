import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { createDevice } from '../model/project'
import { cableSchedule } from './cableSchedule'
import { deviceSheets } from './deviceSheets'

const p = createExampleProject(new Date(2026, 9, 13))
const sheet = (name: string) => deviceSheets(p).find((s) => s.name === name)!

describe('deviceSheets', () => {
  it('fait une fiche par appareil qui n’est pas un switch, triée par nom', () => {
    expect(deviceSheets(p).map((s) => s.name)).toEqual([
      'AP-1', 'CAM-1', 'CAM-2', 'DMX-1', 'DNT-1', 'FIX-1', 'GW-1', 'IOT-1', 'IOT-2',
      'LED-1', 'LX-1', 'MAC-1', 'MQT-1', 'PC-1', 'PIX-1', 'SPK-1', 'SPK-2'
    ])
  })

  it('décrit chaque branchement en une ligne (spec § 11.1, section 2)', () => {
    expect(sheet('CAM-1')).toMatchObject({ kind: 'Caméra PTZ NDI', ip: '10.40.0.21 statique', zone: 'Salle' })
    expect(sheet('CAM-1').lines.map((l) => l.text)).toEqual(['ETH › SW-2 · port 1 · PoE+ actif (25 W) · VLAN 40 NDI · C-010 Cat6 12 m'])
    expect(sheet('AP-1').lines.map((l) => l.text)).toEqual([
      'ETH › SW-2 · port 3 · PoE+ actif (21 W) · Trunk natif 10 Gestion · étiquetés : 10, 60 · C-012 Cat6 8 m',
      'Wi-Fi › IOT-2 · Wi-Fi · VLAN 60 IoT / MQTT · C-016 Wi-Fi'
    ])
    expect(sheet('PIX-1').lines.map((l) => l.text)).toEqual([
      'ETH1 › SW-1 · port 12 · VLAN 50 Éclairage · C-008 Cat6 15 m',
      'OUT1 › LED-1 · IN · C-017 Pixels 2 m'
    ])
    expect(sheet('SPK-1').ip).toBe('DHCP')
    expect(sheet('CAM-1').networked).toBe(true)
    expect(sheet('FIX-1').networked).toBe(false)
    expect(sheet('LED-1').networked).toBe(false)
  })

  it('ne contredit jamais la liste de branchement (spec § 1, critère 2)', () => {
    const rows = new Map(cableSchedule(p).rows.map((r) => [r[0], r]))
    let checked = 0
    for (const s of deviceSheets(p)) {
      for (const { connection: c } of s.lines) {
        const r = rows.get(c.cableId)
        expect(r, c.cableId).toBeDefined()
        expect([r![1], r![2]].sort()).toEqual([c.fromLabel, c.toLabel].sort())
        expect(r!.slice(3, 10)).toEqual([c.medium, c.lengthM ?? null, c.poeLabel, c.modeLabel, c.nativeLabel, c.taggedLabel, c.note])
        checked++
      }
    }
    // 13 câbles appareil → switch (une fiche), 1 passerelle → switch, 3 entre deux appareils (deux fiches), 1 entre switchs (aucune).
    expect(checked).toBe(20)
  })
})

describe('deviceSheets : ligne DMX', () => {
  it('ajoute le résumé du patch aux appareils patchables seulement', () => {
    let q = createExampleProject(new Date(2026, 9, 13))
    q = { ...q, devices: [...q.devices, { ...createDevice(q, 'dmx-fixture', { x: 0, y: 0 }, { id: 'wash' }), name: 'WASH-9', dmx: { footprint: 16, address: 33, universe: 2, mode: 'Standard 16 ch' } }] }
    const find = (name: string) => deviceSheets(q).find((s) => s.name === name)!
    expect(find('WASH-9').extras).toEqual(['DMX : U2 · 33–48 · 16 ch · Standard 16 ch'])
    expect(find('CAM-1').extras).toEqual([])
  })
})
