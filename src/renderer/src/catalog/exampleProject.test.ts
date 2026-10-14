// src/renderer/src/catalog/exampleProject.test.ts
import { describe, expect, it } from 'vitest'
import { EXAMPLE_TITLE, createExampleProject } from './exampleProject'
import { ProjectSchema } from '../model/schema'
import { sanitizeProject } from '../model/sanitize'
import { parseProjectFile, serializeProject } from '../model/file'
import { switchPoeUsage } from '../model/derive'

const p = createExampleProject(new Date(2026, 9, 13))
const byName = (name: string) => p.devices.find((d) => d.name === name)!

describe('createExampleProject', () => {
  it('est un projet valide que l’ouverture ne modifie pas', () => {
    expect(ProjectSchema.safeParse(p).success).toBe(true)
    expect(sanitizeProject(p).warnings).toEqual([])
    expect(parseProjectFile(serializeProject(p))).toMatchObject({ ok: true, warnings: [] })
  })

  it('réunit 19 appareils, 18 câbles, 6 VLAN et 3 zones', () => {
    expect(p.meta.title).toBe(EXAMPLE_TITLE)
    expect(p.devices).toHaveLength(19)
    expect(p.links).toHaveLength(18)
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

  it('ne présente pas l’app comme un outil pour étudiants', () => {
    expect(serializeProject(p)).not.toMatch(/étudiant|etudiant|fin de bac|student/i)
  })
})
