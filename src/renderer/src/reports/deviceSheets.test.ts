import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { createDevice, createProject } from '../model/project'
import type { Device, Link, PortDef, Project } from '../model/types'
import { cableSchedule } from './cableSchedule'
import { deviceSheets } from './deviceSheets'

const p = createExampleProject(new Date(2026, 9, 13), 'fr')
const sheet = (name: string) => deviceSheets(p, 'fr').find((s) => s.name === name)!

describe('deviceSheets', () => {
  it('fait une fiche par appareil qui n’est pas un switch, triée par nom', () => {
    expect(deviceSheets(p, 'fr').map((s) => s.name)).toEqual([
      'AP-1', 'CAM-1', 'CAM-2', 'DMX-1', 'DNT-1', 'FIX-1', 'GW-1', 'IOT-1', 'IOT-2',
      'LED-1', 'LED-2', 'LX-1', 'MAC-1', 'MH-1', 'MH-2', 'MH-3', 'MQT-1', 'PC-1', 'PIX-1', 'PSU-1', 'SPK-1', 'SPK-2'
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
    const rows = new Map(cableSchedule(p, 'fr').rows.map((r) => [r[0], r]))
    let checked = 0
    for (const s of deviceSheets(p, 'fr')) {
      for (const { connection: c } of s.lines) {
        const r = rows.get(c.cableId)
        expect(r, c.cableId).toBeDefined()
        expect([r![1], r![2]].sort()).toEqual([c.fromLabel, c.toLabel].sort())
        expect(r!.slice(3, 10)).toEqual([c.medium, c.lengthM ?? null, c.poeLabel, c.modeLabel, c.nativeLabel, c.taggedLabel, c.note])
        checked++
      }
    }
    // 13 câbles appareil → switch (une fiche), 1 passerelle → switch, 8 entre deux appareils (deux fiches), 1 entre switchs (aucune).
    expect(checked).toBe(30)
  })
})

describe('deviceSheets : ligne DMX', () => {
  it('ajoute le résumé du patch aux appareils patchables seulement', () => {
    let q = createExampleProject(new Date(2026, 9, 13), 'fr')
    q = { ...q, devices: [...q.devices, { ...createDevice(q, 'dmx-fixture', { x: 0, y: 0 }, { lang: 'fr', id: 'wash' }), name: 'WASH-9', dmx: { footprint: 16, address: 33, universe: 2, mode: 'Standard 16 ch' } }] }
    const find = (name: string) => deviceSheets(q, 'fr').find((s) => s.name === name)!
    expect(find('WASH-9').extras).toEqual(['DMX : U2 · 33–48 · 16 ch · Standard 16 ch'])
    expect(find('CAM-1').extras).toEqual([])
  })
})

const dc = (id: string): PortDef => ({ id, label: id.replace(/-/g, ' '), connector: 'dc' })
const dev = (id: string, name: string, extra: Partial<Device>): Device => ({ id, templateId: 'generic', name, position: { x: 0, y: 0 }, portSide: 'auto', ports: [], portState: {}, ...extra })
const link = (id: string, a: [string, string], b: [string, string]): Link => ({ id, cableId: id, a: { deviceId: a[0], portId: a[1] }, b: { deviceId: b[0], portId: b[1] }, medium: 'dc' })

// Une alim 24 V 15 A qui nourrit deux bandes COB de 144 W, plus une lyre de 470 W.
function benchWithLyre(): Project {
  const strip = { type: 'cob' as const, volts: 24, wPerM: 14.4, lengthM: 10 }
  return {
    ...createProject(new Date(2026, 9, 14), 'fr'),
    devices: [
      dev('psu', 'PSU-1', { ports: [dc('DC-OUT-1'), dc('DC-OUT-2'), dc('DC-OUT-3'), dc('DC-OUT-4')], psu: { volts: 24, amps: 15 } }),
      dev('led1', 'LED-1', { ports: [dc('DC-IN')], ledStrip: strip }),
      dev('led2', 'LED-2', { ports: [dc('DC-IN')], ledStrip: strip }),
      dev('mh', 'MH-1', { powerW: 470 })
    ],
    links: [link('l1', ['psu', 'DC-OUT-1'], ['led1', 'DC-IN']), link('l2', ['led2', 'DC-IN'], ['psu', 'DC-OUT-2'])]
  }
}

describe('deviceSheets : puissance', () => {
  it('ajoute puissance, bande et alimentation aux fiches', () => {
    const sheets = deviceSheets(benchWithLyre(), 'fr')
    const extras = (name: string) => sheets.find((s) => s.name === name)!.extras
    expect(extras('MH-1')).toEqual(['Puissance : 470 W'])
    expect(extras('LED-1')).toEqual(['COB mono · 24 V · 14,4 W/m · 10 m · 144 W'])
    expect(extras('PSU-1')).toEqual(['Alimentation : 24 V · 360 W · charge 288 W (80 %)'])
  })
})
