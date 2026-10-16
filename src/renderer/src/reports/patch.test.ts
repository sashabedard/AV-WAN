import { describe, expect, it } from 'vitest'
import type { Device, Project } from '../model/types'
import { createDevice, createProject } from '../model/project'
import { patchIndex } from '../model/dmx'
import { patchShowProject as show } from './__fixtures__/patchShow'
import { dmxSummary, patchGroups, patchTable } from './patch'

describe('patchGroups', () => {
  it('un groupe par univers trié par adresse, puis « Sans univers »', () => {
    const groups = patchGroups(show(), 'fr')
    expect(groups.map((g) => g.title)).toEqual(['Univers 1 · ODE-1 › DMX 1', 'Univers 2', 'Sans univers'])
    expect(groups[0]!.rows.map((r) => [r.address, r.end, r.device])).toEqual([
      [1, 16, 'MH-1'],
      [10, 17, 'PAR-1'],
      [17, 32, 'MH-2']
    ])
  })

  it('note les chevauchements en remarque', () => {
    const rows = patchGroups(show(), 'fr')[0]!.rows
    expect(rows[0]!.remark).toBe('Chevauche PAR-1 (10–17)')
    expect(rows[1]!.remark).toBe('Chevauche MH-1 (1–16) · Chevauche MH-2 (17–32)')
  })
})

describe('univers tapé contredit par le câble', () => {
  it('le note en remarque', () => {
    const p = show()
    const q = { ...p, devices: p.devices.map((d) => (d.id === 'mh2' ? { ...d, dmx: { ...d.dmx!, universe: 2 } } : d)) }
    const row = patchTable(q, 'fr').rows.find((r) => r[4] === 'MH-2')!
    expect(row[0]).toBe(2)
    expect(row.at(-1)).toBe('Univers tapé 2 ; le câble donne 1')
    expect(patchTable(show(), 'fr').rows.find((r) => r[4] === 'PAR-1')!.at(-1)).toBe('Chevauche MH-1 (1–16) · Chevauche MH-2 (17–32)')
  })
})

describe('patchTable', () => {
  it('à plat, trié par univers puis adresse, une colonne par champ', () => {
    const t = patchTable(show(), 'fr')
    expect([t.id, t.title]).toEqual(['patch-dmx', 'Patch DMX'])
    expect(t.columns.map((c) => c.label)).toEqual(['Univers', 'Adresse', 'Fin', 'Canaux', 'Appareil', 'Modèle', 'Mode', 'Source', 'Zone', 'Remarque'])
    expect(t.rows[0]).toEqual([1, 1, 16, 16, 'MH-1', 'Lyre spot', 'Standard 16 ch', 'ODE-1 › DMX 1', '', 'Chevauche PAR-1 (10–17)'])
    expect(t.rows.at(-1)).toEqual([null, null, null, 2, 'HAZE-1', 'Appareil DMX', '', '', '', ''])
    for (const r of t.rows) expect(r).toHaveLength(t.columns.length)
  })

  it('vide quand rien n’est patchable', () => {
    expect(patchTable(createProject(undefined, 'fr'), 'fr').rows).toEqual([])
  })
})

describe('dmxSummary', () => {
  it('résume le patch pour la fiche de l’appareil', () => {
    const index = patchIndex(show())
    expect(dmxSummary(index.entries.get('mh1')!, 'fr')).toBe('DMX : U1 · 1–16 · 16 ch · Standard 16 ch')
    expect(dmxSummary(index.entries.get('none')!, 'fr')).toBe('DMX : univers inconnu · adresse à définir · 2 ch')
  })
})

it('liste une bande pixel dans chaque univers qu’elle occupe', () => {
  let p: Project = createProject(new Date(2026, 9, 14), 'fr')
  const add = (id: string, templateId: string, extra: Partial<Device>): void => {
    p = { ...p, devices: [...p.devices, { ...createDevice(p, templateId, { x: 0, y: 0 }, { lang: 'fr', id }), ...extra }] }
  }
  add('pix', 'pixel-controller', { name: 'PIX-1', portState: { OUT1: { universe: 10 } } })
  add('led', 'led-strip', { name: 'LED-1', model: 'Ruban scène', ledStrip: { type: 'sk6812-rgbw', volts: 24, wPerM: 14.4, lengthM: 5, pxPerM: 60 } })
  p = { ...p, links: [{ id: 'l', cableId: 'C-001', a: { deviceId: 'pix', portId: 'OUT1' }, b: { deviceId: 'led', portId: 'IN' }, medium: 'pixel' }] }
  const t = patchTable(p, 'fr')
  expect(t.rows).toEqual([
    [10, 1, 512, 512, 'LED-1', 'Ruban scène', 'Pixel RGBW (SK6812) · 128 px', 'PIX-1 › OUT1', '', ''],
    [11, 1, 512, 512, 'LED-1', 'Ruban scène', 'Pixel RGBW (SK6812) · 128 px', 'PIX-1 › OUT1', '', ''],
    [12, 1, 176, 176, 'LED-1', 'Ruban scène', 'Pixel RGBW (SK6812) · 44 px', 'PIX-1 › OUT1', '', '']
  ])
  expect(patchGroups(p, 'fr').map((g) => g.title)).toEqual(['Univers 10 · PIX-1 › OUT1', 'Univers 11 · PIX-1 › OUT1', 'Univers 12 · PIX-1 › OUT1'])
})

describe('source « tapé » (plan 6 : code interne, libellé à l’affichage)', () => {
  it('le tableau affiche le libellé « tapé » et l’en-tête de groupe ne le nomme pas', () => {
    const sources = patchTable(show(), 'fr').rows.map((r) => r[7])
    expect(sources).toContain('tapé')
    expect(sources).not.toContain('typed')
    expect(patchGroups(show(), 'fr').map((g) => g.title)).toEqual(['Univers 1 · ODE-1 › DMX 1', 'Univers 2', 'Sans univers'])
  })
})

describe('patchTable en anglais', () => {
  it('écrit le patch DMX en anglais', () => {
    const t = patchTable(show(), 'en')
    expect([t.id, t.title]).toEqual(['dmx-patch', 'DMX patch'])
    expect(t.columns.map((c) => c.label)).toEqual(['Universe', 'Address', 'End', 'Channels', 'Device', 'Model', 'Mode', 'Source', 'Zone', 'Remark'])
    expect(patchGroups(show(), 'en').at(-1)?.title).toBe('No universe')
  })
})
