// src/renderer/src/samples/exampleProject.test.ts
import { describe, expect, it } from 'vitest'
import { EXAMPLE_TITLE, createExampleProject } from './exampleProject'
import { ProjectSchema } from '../model/schema'
import { sanitizeProject } from '../model/sanitize'
import { parseProjectFile, serializeProject } from '../model/file'
import { switchPoeUsage } from '../model/derive'
import { patchGroups, patchTable } from '../reports/patch'
import { psuLoad } from '../model/power'
import { nodeSize } from '../canvas/nodeGeometry'

const p = createExampleProject(new Date(2026, 9, 13))
const byName = (name: string) => p.devices.find((d) => d.name === name)!

describe('createExampleProject', () => {
  it('est un projet valide que l’ouverture ne modifie pas', () => {
    expect(ProjectSchema.safeParse(p).success).toBe(true)
    expect(sanitizeProject(p).warnings).toEqual([])
    expect(parseProjectFile(serializeProject(p))).toMatchObject({ ok: true, warnings: [] })
  })

  it('réunit 24 appareils, 23 câbles, 6 VLAN et 3 zones', () => {
    expect(p.meta.title).toBe(EXAMPLE_TITLE)
    expect(p.devices).toHaveLength(24)
    expect(p.links).toHaveLength(23)
    expect(p.vlans.map((v) => v.id)).toEqual([10, 20, 30, 40, 50, 60])
    expect(p.zones.map((z) => z.name)).toEqual(['Régie', 'Salle', 'Scène'])
  })

  it('range chaque appareil dans sa zone', () => {
    expect(p.devices.every((d) => d.zoneId !== undefined)).toBe(true)
    expect(byName('SW-1').zoneId).toBe('ex-z-regie')
    expect(byName('CAM-2').zoneId).toBe('ex-z-salle')
    expect(byName('FIX-1').zoneId).toBe('ex-z-scene')
  })

  it('règle les VLAN sur les ports des switchs et reste dans le budget PoE', () => {
    expect(byName('SW-1').portState['2']).toEqual({ mode: 'access', nativeVlan: 20 })
    expect(byName('SW-1').portState['1']).toEqual({ mode: 'trunk', nativeVlan: 10, taggedVlans: 'all' })
    expect(byName('IOT-2').portState['WIFI']).toEqual({ mode: 'access', nativeVlan: 60 })
    const usage = switchPoeUsage(p, byName('SW-2').id)
    expect(usage).toEqual({ usedW: 123, budgetW: 150 })
  })

  it('montre le patch, les alimentations et les bandes', () => {
    expect(p.settings.mainsVoltage).toBe(120)
    const groups = patchGroups(p)
    expect(groups.map((g) => g.title)).toEqual(expect.arrayContaining(['Univers 1 · DMX-1 › DMX 1', 'Univers 2 · DMX-1 › DMX 2']))
    expect(groups.find((g) => g.universe === 2)!.rows.map((r) => r.address)).toEqual([1, 17, 33])
    expect(patchTable(p).rows.some((r) => r[0] === 10 && r[4] === 'LED-1')).toBe(true)
    const psu = p.devices.find((d) => d.psu)!
    expect(psuLoad(p, psu.id)).toMatchObject({ capacityW: 360, loadW: 216 })
    expect(patchTable(p).rows.every((r) => r[9] === '')).toBe(true)
  })

  it('place l’alimentation sous LED-1, dans la Scène agrandie, sans qu’une tuile en chevauche une autre', () => {
    const psu = p.devices.find((d) => d.psu)!
    expect(psu.position).toEqual({ x: 80, y: 940 })
    expect(psu.zoneId).toBe('ex-z-scene')
    expect(p.zones.find((z) => z.id === 'ex-z-scene')!.rect).toEqual({ x: 0, y: 600, w: 1660, h: 440 })
    const boxes = p.devices.map((d) => ({ name: d.name, ...d.position, ...nodeSize(d) }))
    const overlaps: string[] = []
    boxes.forEach((a, i) => {
      for (const b of boxes.slice(i + 1)) if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) overlaps.push(`${a.name} × ${b.name}`)
    })
    expect(overlaps).toEqual([])
    for (const b of boxes) {
      const zone = p.zones.find((z) => z.id === p.devices.find((d) => d.name === b.name)!.zoneId)!.rect
      expect(b.x >= zone.x && b.y >= zone.y && b.x + b.w <= zone.x + zone.w && b.y + b.h <= zone.y + zone.h, b.name).toBe(true)
    }
  })

  it('ne présente pas l’app comme un outil pour étudiants', () => {
    expect(serializeProject(p)).not.toMatch(/étudiant|etudiant|fin de bac|student/i)
  })
})
