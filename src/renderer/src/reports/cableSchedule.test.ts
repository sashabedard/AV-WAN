import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { cableSchedule } from './cableSchedule'

const p = createExampleProject(new Date(2026, 9, 13), 'fr')
const row = (project: typeof p, id: string) => cableSchedule(project, 'fr').rows.find((r) => r[0] === id)

describe('cableSchedule', () => {
  it('liste chaque câble une fois, trié par identifiant, sous les colonnes de la spec', () => {
    const t = cableSchedule(p, 'fr')
    expect(t).toMatchObject({ id: 'branchement', title: 'Liste de branchement' })
    expect(t.columns.map((c) => c.label)).toEqual(['Câble', 'De', 'Vers', 'Médium', 'Longueur (m)', 'PoE', 'Mode', 'VLAN natif', 'VLAN étiquetés', 'Note'])
    expect(t.rows.map((r) => r[0])).toEqual(Array.from({ length: 23 }, (_, i) => `C-${String(i + 1).padStart(3, '0')}`))
  })

  it('donne les ports, le médium, la longueur, le PoE et le VLAN de chaque câble', () => {
    expect(row(p, 'C-001')).toEqual(['C-001', 'GW-1 · LAN1', 'SW-1 · port 1', 'Cat6', 1, '—', 'Trunk', '10 Gestion', 'Tous', ''])
    expect(row(p, 'C-002')).toEqual(['C-002', 'SW-1 · S1', 'SW-2 · S1', 'Fibre OM4', 30, '—', 'Trunk', '10 Gestion', 'Tous', ''])
    expect(row(p, 'C-010')).toEqual(['C-010', 'CAM-1 · ETH', 'SW-2 · port 1', 'Cat6', 12, 'PoE+ actif (25 W)', 'Accès', '40 NDI', '—', ''])
    expect(row(p, 'C-016')).toEqual(['C-016', 'IOT-2 · Wi-Fi', 'AP-1 · Wi-Fi', 'Wi-Fi', null, '—', 'Accès', '60 IoT / MQTT', '—', ''])
    expect(row(p, 'C-017')).toEqual(['C-017', 'PIX-1 · OUT1', 'LED-1 · IN', 'Pixels', 2, '—', '—', '—', '—', ''])
  })

  it('garde la note et ne plante pas sur un VLAN retiré du projet', () => {
    const q = {
      ...p,
      vlans: p.vlans.filter((v) => v.id !== 40),
      links: p.links.map((l) => (l.cableId === 'C-010' ? { ...l, note: 'Passe sous la scène' } : l))
    }
    expect(row(q, 'C-010')).toEqual(['C-010', 'CAM-1 · ETH', 'SW-2 · port 1', 'Cat6', 12, 'PoE+ actif (25 W)', 'Accès', '40', '—', 'Passe sous la scène'])
  })
})

describe('cableSchedule en anglais', () => {
  it('écrit la liste de branchement en anglais', () => {
    const t = cableSchedule(p, 'en')
    expect(t.id).toBe('cabling')
    expect(t.title).toBe('Cabling schedule')
    expect(t.columns.map((c) => c.label)).toEqual(['Cable', 'From', 'To', 'Medium', 'Length (m)', 'PoE', 'Mode', 'Native VLAN', 'Tagged VLANs', 'Note'])
    expect(row(p, 'C-010')).toBeDefined()
    expect(t.rows.find((r) => r[0] === 'C-010')).toEqual(['C-010', 'CAM-1 · ETH', 'SW-2 · port 1', 'Cat6', 12, 'PoE+ active (25 W)', 'Access', '40 NDI', '—', ''])
    expect(t.rows.find((r) => r[0] === 'C-001')?.[8]).toBe('All')
  })
})
