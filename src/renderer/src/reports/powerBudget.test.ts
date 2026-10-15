// src/renderer/src/reports/powerBudget.test.ts
import { describe, expect, it } from 'vitest'
import { createProject } from '../model/project'
import { powerShowProject as show } from './__fixtures__/powerShow'
import { powerBudget, powerTable } from './powerBudget'

describe('powerBudget', () => {
  it('compte chaque watt une fois : alimentation nominale, bandes via l’alim, caméra via son switch', () => {
    const b = powerBudget(show())
    expect(b.zones.map((z) => [z.zone, z.subtotalW])).toEqual([
      ['Scène', 830],
      ['Salle', 0]
    ])
    expect(b.totalW).toBe(830)
    expect(b.amps).toBe(6.9)
    expect(b.voltage).toBe(120)
    expect(b.missing).toEqual(['SW-1'])
  })

  it('décrit les lignes d’une zone, triées par nom', () => {
    const scene = powerBudget(show()).zones[0]!
    expect(scene.rows).toEqual([
      { device: 'LED-1', type: 'Bande LED', watts: 144, fedBy: 'PSU-1', remark: '' },
      { device: 'LED-2', type: 'Bande LED', watts: 144, fedBy: 'PSU-1', remark: '' },
      { device: 'MH-1', type: 'Lyre spot', watts: 470, fedBy: '', mainsW: 470, remark: '' },
      { device: 'PSU-1', type: 'Appareil générique', watts: 360, fedBy: '', mainsW: 360, remark: 'charge 288 W / 360 W (80 %)' }
    ])
    const salle = powerBudget(show()).zones[1]!
    expect(salle.rows).toEqual([{ device: 'CAM-1', type: 'Caméra IP', watts: 7, fedBy: 'SW-1', remark: 'via PoE · SW-1' }])
  })

  it('résume les alimentations', () => {
    expect(powerBudget(show()).psus).toEqual([{ name: 'PSU-1', volts: 24, capacityW: 360, loadW: 288, ratio: 0.8, fed: ['LED-1', 'LED-2'], remark: '' }])
  })

  it('230 V : moins d’ampères', () => {
    const p = show()
    expect(powerBudget({ ...p, settings: { ...p.settings, mainsVoltage: 230 } }).amps).toBe(3.6)
  })

  it('projet vide : zéro partout, jamais NaN', () => {
    const b = powerBudget(createProject())
    expect([b.totalW, b.amps, b.zones.length, b.psus.length, b.missing.length]).toEqual([0, 0, 0, 0, 0])
  })
})

describe('powerTable', () => {
  it('à plat, sous-totaux et total en nombres sommables', () => {
    const t = powerTable(show())
    expect([t.id, t.title]).toEqual(['bilan-puissance', 'Bilan de puissance'])
    expect(t.columns.map((c) => c.label)).toEqual(['Zone', 'Appareil', 'Type', 'Puissance (W)', 'Alimenté par', 'Compté au secteur (W)', 'Remarque'])
    expect(t.rows).toContainEqual(['Scène', 'Sous-total', '', null, '', 830, ''])
    expect(t.rows).toContainEqual(['', 'Total', '', null, '', 830, '6,9 A à 120 V'])
    expect(t.rows.at(-1)).toEqual(['', 'Sans puissance renseignée', '', null, '', null, 'SW-1'])
    for (const r of t.rows) expect(r).toHaveLength(t.columns.length)
  })
})
