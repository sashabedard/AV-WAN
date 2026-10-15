// src/renderer/src/reports/bom.test.ts
import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { sampleProject } from '../model/__fixtures__/sample'
import { bom } from './bom'
import { createDevice, createProject } from '../model/project'
import type { Project } from '../model/types'

const p = createExampleProject(new Date(2026, 9, 13))
const of = (kind: string, project = p) => bom(project).rows.filter((r) => r[0] === kind)

describe('bom', () => {
  it('compte les appareils par gabarit et modèle ; un switch est décrit par sa configuration', () => {
    const t = bom(p)
    expect(t).toMatchObject({ id: 'nomenclature', title: 'Nomenclature' })
    expect(t.columns.map((c) => c.label)).toEqual(['Catégorie', 'Désignation', 'Détail', 'Quantité'])
    const devices = of('Appareil')
    expect(devices).toHaveLength(20)
    expect(devices.reduce((s, r) => s + (r[3] as number), 0)).toBe(24)
    expect(devices).toContainEqual(['Appareil', 'Caméra PTZ NDI', '—', 2])
    expect(devices).toContainEqual(['Appareil', 'Switch', 'Switch de régie 24 PoE+ · 24×PoE+ · 2×SFP+', 1])
    expect(devices).toContainEqual(['Appareil', 'PC média (TouchDesigner, Resolume)', 'TouchDesigner', 1])
  })

  it('compte les câbles par médium et longueur arrondie au mètre supérieur, sans la liaison Wi-Fi', () => {
    expect(of('Câble')).toEqual([
      ['Câble', 'Cat6', '1 m', 1],
      ['Câble', 'Cat6', '2 m', 1],
      ['Câble', 'Cat6', '3 m', 3],
      ['Câble', 'Cat6', '5 m', 1],
      ['Câble', 'Cat6', '8 m', 1],
      ['Câble', 'Cat6', '10 m', 1],
      ['Câble', 'Cat6', '12 m', 2],
      ['Câble', 'Cat6', '15 m', 2],
      ['Câble', 'Cat6', '20 m', 2],
      ['Câble', 'Fibre OM4', '30 m', 1],
      ['Câble', 'DMX', '3 m', 2],
      ['Câble', 'DMX', '8 m', 1],
      ['Câble', 'DMX', '10 m', 1],
      ['Câble', 'Pixels', '2 m', 1],
      ['Câble', 'Alim DC', '2 m', 2]
    ])
  })

  it('déduit un module optique par cage branchée en fibre, aucun pour un DAC', () => {
    expect(of('Module')).toEqual([['Module', 'Module SFP+ multimode', 'pour fibre OM3 / OM4', 2]])
    const dac = { ...p, links: p.links.map((l) => (l.cableId === 'C-002' ? { ...l, medium: 'dac' as const } : l)) }
    expect(of('Module', dac)).toEqual([])
  })

  it('arrondit au mètre supérieur et signale une longueur manquante', () => {
    const q = sampleProject()
    q.links[0]!.lengthM = 2.3
    expect(of('Câble', q)).toEqual([['Câble', 'Cat6', '3 m', 1]])
    delete q.links[0]!.lengthM
    expect(of('Câble', q)).toEqual([['Câble', 'Cat6', 'longueur à définir', 1]])
  })
})

// Trois bandes COB 24 V 10 W/m (5 m, 10 m, sans longueur) et une alimentation 24 V 15 A.
function stripsProject(): Project {
  let q = createProject(new Date(2026, 9, 14))
  const lengths: (number | undefined)[] = [5, 10, undefined]
  const devices = lengths.map((lengthM, i) => ({
    ...createDevice(q, 'led-strip', { x: 0, y: 0 }, { id: `s${i}` }),
    ledStrip: { type: 'cob' as const, volts: 24, wPerM: 10, ...(lengthM !== undefined ? { lengthM } : {}) }
  }))
  devices.push({ ...createDevice(q, 'psu', { x: 0, y: 0 }, { id: 'p' }), psu: { volts: 24, amps: 15 } } as never)
  q = { ...q, devices }
  return q
}

describe('bom : bandes LED et alimentations', () => {
  it('regroupe les bandes par type, tension et W/m, avec la longueur totale', () => {
    const rows = bom(stripsProject()).rows
    expect(rows).toContainEqual(['Appareil', 'Bande LED COB mono', '24 V · 10 W/m · 15 m au total + longueur à définir', 3])
    expect(rows).toContainEqual(['Appareil', 'Alimentation', '24 V · 360 W', 1])
    expect(rows.some((r) => r[1] === 'Bande LED')).toBe(false)
  })

  it('aucune longueur connue : « longueur à définir », pas « 0 m au total »', () => {
    const p = stripsProject()
    const unknown = p.devices.find((d) => d.id === 's2')! // sans longueur
    const rows = bom({ ...p, devices: [unknown, { ...unknown, id: 's9' }] }).rows
    expect(rows).toContainEqual(['Appareil', 'Bande LED COB mono', '24 V · 10 W/m · longueur à définir', 2])
  })
})
