// src/renderer/src/reports/dataTables.test.ts
import { describe, expect, it } from 'vitest'
import { createExampleProject } from '../samples/exampleProject'
import { dataTables } from './dataTables'

describe('dataTables', () => {
  it('donne la liste de branchement, le plan IP, le patch DMX, le bilan de puissance et la nomenclature, dans cet ordre', () => {
    const tables = dataTables(createExampleProject(new Date(2026, 9, 13)))
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
