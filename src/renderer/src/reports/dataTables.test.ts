// src/renderer/src/reports/dataTables.test.ts
import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { dataTables } from './dataTables'
import { isDataTables } from '../../../shared/tables'

describe('dataTables', () => {
  it('donne la liste de branchement, le plan IP, le patch DMX, le bilan de puissance et la nomenclature, dans cet ordre', () => {
    const tables = dataTables(createExampleProject(new Date(2026, 9, 13), 'fr'), 'fr')
    expect(tables.map((t) => [t.id, t.title])).toEqual([
      ['branchement', 'Liste de branchement'],
      ['plan-ip', 'Plan d’adressage IP'],
      ['patch-dmx', 'Patch DMX'],
      ['bilan-puissance', 'Bilan de puissance'],
      ['nomenclature', 'Nomenclature']
    ])
    for (const t of tables) for (const r of t.rows) expect(r).toHaveLength(t.columns.length)
  })
})

describe('dataTables en anglais', () => {
  it('donne des identifiants de fichiers anglais acceptés par le processus principal', () => {
    const tables = dataTables(createExampleProject(new Date(2026, 9, 13), 'en'), 'en')
    expect(tables.map((t) => t.id)).toEqual(['cabling', 'ip-plan', 'dmx-patch', 'power-budget', 'bill-of-materials'])
    expect(isDataTables(tables)).toBe(true)
    expect(isDataTables(dataTables(createExampleProject(new Date(2026, 9, 13), 'fr'), 'fr'))).toBe(true)
  })
})
