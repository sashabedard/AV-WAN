import { describe, expect, it } from 'vitest'
import { createProject } from '../model/project'
import { patchIndex } from '../model/dmx'
import { patchShowProject as show } from './__fixtures__/patchShow'
import { dmxSummary, patchGroups, patchTable } from './patch'

describe('patchGroups', () => {
  it('un groupe par univers trié par adresse, puis « Sans univers »', () => {
    const groups = patchGroups(show())
    expect(groups.map((g) => g.title)).toEqual(['Univers 1 · ODE-1 › DMX 1', 'Univers 2', 'Sans univers'])
    expect(groups[0]!.rows.map((r) => [r.address, r.end, r.device])).toEqual([
      [1, 16, 'MH-1'],
      [10, 17, 'PAR-1'],
      [17, 32, 'MH-2']
    ])
  })

  it('note les chevauchements en remarque', () => {
    const rows = patchGroups(show())[0]!.rows
    expect(rows[0]!.remark).toBe('Chevauche PAR-1 (10–17)')
    expect(rows[1]!.remark).toBe('Chevauche MH-1 (1–16) · Chevauche MH-2 (17–32)')
  })
})

describe('patchTable', () => {
  it('à plat, trié par univers puis adresse, une colonne par champ', () => {
    const t = patchTable(show())
    expect([t.id, t.title]).toEqual(['patch-dmx', 'Patch DMX'])
    expect(t.columns.map((c) => c.label)).toEqual(['Univers', 'Adresse', 'Fin', 'Canaux', 'Appareil', 'Modèle', 'Mode', 'Source', 'Zone', 'Remarque'])
    expect(t.rows[0]).toEqual([1, 1, 16, 16, 'MH-1', 'Lyre spot', 'Standard 16 ch', 'ODE-1 › DMX 1', '', 'Chevauche PAR-1 (10–17)'])
    expect(t.rows.at(-1)).toEqual([null, null, null, 2, 'HAZE-1', 'Appareil DMX', '', '', '', ''])
    for (const r of t.rows) expect(r).toHaveLength(t.columns.length)
  })

  it('vide quand rien n’est patchable', () => {
    expect(patchTable(createProject()).rows).toEqual([])
  })
})

describe('dmxSummary', () => {
  it('résume le patch pour la fiche de l’appareil', () => {
    const index = patchIndex(show())
    expect(dmxSummary(index.entries.get('mh1')!)).toBe('DMX : U1 · 1–16 · 16 ch · Standard 16 ch')
    expect(dmxSummary(index.entries.get('none')!)).toBe('DMX : univers inconnu · adresse à définir · 2 ch')
  })
})
