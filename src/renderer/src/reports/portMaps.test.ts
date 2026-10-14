// src/renderer/src/reports/portMaps.test.ts
import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { portMaps } from './portMaps'

const p = createExampleProject(new Date(2026, 9, 13))
const sw2 = (project = p) => portMaps(project).find((m) => m.name === 'SW-2')!

describe('portMaps', () => {
  it('fait une carte par switch, triée par nom, avec la configuration et l’usage PoE', () => {
    expect(portMaps(p).map((m) => [m.name, m.summary, m.poe, m.ip])).toEqual([
      ['SW-1', '24×PoE+ · 2×SFP+', 'PoE 3 / 400 W', '10.10.10.2 statique'],
      ['SW-2', '8×PoE+ · 2×SFP+', 'PoE 123 / 150 W', '10.10.10.3 statique']
    ])
  })

  it('décrit chaque port : appareil branché, câble, réglage lu sur le port du switch, PoE', () => {
    const rows = sw2().rows
    expect(rows).toHaveLength(10)
    expect(rows[0]).toEqual({
      portId: '1', port: '1', peer: 'CAM-1 · ETH', cableId: 'C-010', mode: 'Accès', native: '40 NDI', tagged: '—',
      poe: 'PoE+ actif (25 W)', fill: '#2563C9', trunk: false, poeActive: true
    })
    expect(rows[6]).toEqual({
      portId: '7', port: '7', peer: '—', cableId: '—', mode: '—', native: '—', tagged: '—',
      poe: 'PoE+ disponible', trunk: false, poeActive: false
    })
    expect(rows[8]).toEqual({
      portId: 'SFP+1', port: 'S1', peer: 'SW-1 · S1', cableId: 'C-002', mode: 'Trunk', native: '10 Gestion', tagged: 'Tous',
      poe: '—', fill: '#646C75', trunk: true, poeActive: false
    })
  })

  it('signale un PoE coupé et un VLAN retiré du projet, sans planter', () => {
    const q = structuredClone(p)
    q.devices.find((d) => d.name === 'SW-2')!.portState['7'] = { mode: 'access', nativeVlan: 35, poeEnabled: false }
    const row = sw2(q).rows[6]!
    expect(row).toMatchObject({ mode: 'Accès', native: '35', poe: 'Désactivé', trunk: false })
    expect(row.fill).toBeUndefined()
  })

  it('ne fait aucune carte sans switch', () => {
    expect(portMaps({ ...p, devices: p.devices.filter((d) => !d.switch), links: [] })).toEqual([])
  })
})
