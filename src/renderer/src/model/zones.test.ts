import { describe, expect, it } from 'vitest'
import type { Project, Zone } from './types'
import { assignZones, createZone, moveZones, nextZoneName, placeDevices, removeZones, resizeZone, zoneAround, zoneAt, zonesWithin, ZONE_COLORS } from './zones'
import { sampleProject } from './__fixtures__/sample'

const zone = (id: string, x: number, y: number, w: number, h: number): Zone => ({ id, name: id, color: '#3E8EF7', rect: { x, y, w, h }, ownPdfPage: false })
const withZones = (...zones: Zone[]): Project => ({ ...sampleProject(), zones })

describe('zones', () => {
  it('nomme et colore une nouvelle zone', () => {
    const p = withZones(zone('Zone 1', 0, 0, 10, 10))
    expect(nextZoneName(p)).toBe('Zone 2')
    expect(createZone(p, { x: 0, y: 0, w: 100, h: 80 }, { id: 'z' })).toEqual({ id: 'z', name: 'Zone 2', color: ZONE_COLORS[1], rect: { x: 0, y: 0, w: 100, h: 80 }, ownPdfPage: false })
  })

  it('entoure des appareils avec une marge et la place du titre', () => {
    // CAM-1 en (0, 200), tuile 176 × 58
    expect(zoneAround(sampleProject(), ['cam1'])).toEqual({ x: -24, y: 148, w: 224, h: 134 })
    expect(zoneAround(sampleProject(), [])).toBeNull()
  })

  it('choisit la plus petite zone qui contient un point', () => {
    const p = withZones(zone('grande', 0, 0, 1000, 1000), zone('petite', 100, 100, 200, 200))
    expect(zoneAt(p, { x: 150, y: 150 })?.id).toBe('petite')
    expect(zoneAt(p, { x: 900, y: 900 })?.id).toBe('grande')
    expect(zoneAt(p, { x: 2000, y: 0 })).toBeUndefined()
  })

  it('assigne la zone selon le centre de la tuile, et rend le même projet sans changement', () => {
    const p = withZones(zone('z1', -24, 148, 224, 134))
    const q = assignZones(p)
    expect(q.devices.map((d) => d.zoneId)).toEqual([undefined, 'z1'])
    expect(assignZones(q)).toBe(q)
    const plan1 = sampleProject()
    expect(assignZones(plan1)).toBe(plan1) // fichier du plan 1 : rien ne change
  })

  it('retire la zone d’un appareil qui en sort', () => {
    const p = assignZones(withZones(zone('z1', -24, 148, 224, 134)))
    const out = assignZones(placeDevices(p, [{ id: 'cam1', position: { x: 600, y: 600 } }]), ['cam1'])
    expect('zoneId' in out.devices[1]!).toBe(false)
  })

  it('déplace une zone avec ses membres seulement', () => {
    const p = assignZones(withZones(zone('z1', -24, 148, 224, 134)))
    const q = moveZones(p, [{ id: 'z1', dx: 40, dy: 8 }])
    expect(q.zones[0]!.rect).toMatchObject({ x: 16, y: 156 })
    expect(q.devices.map((d) => d.position)).toEqual([{ x: 0, y: 0 }, { x: 40, y: 208 }])
    expect(moveZones(p, [{ id: 'z1', dx: 0, dy: 0 }])).toBe(p)
  })

  it('supprime une zone en gardant ses appareils', () => {
    const p = assignZones(withZones(zone('z1', -24, 148, 224, 134)))
    const q = removeZones(p, ['z1'])
    expect(q.zones).toEqual([])
    expect(q.devices).toHaveLength(2)
    expect(q.devices[1]!.zoneId).toBeUndefined()
    expect(removeZones(p, [])).toBe(p)
  })

  it('supprimer une zone détache les baies qui y étaient rattachées', () => {
    const p = { ...assignZones(withZones(zone('z1', -24, 148, 224, 134))), racks: [{ id: 'r1', name: 'BAIE-1', heightU: 12, zoneId: 'z1' }, { id: 'r2', name: 'BAIE-2', heightU: 12 }] }
    const q = removeZones(p, ['z1'])
    expect(q.racks).toEqual([{ id: 'r1', name: 'BAIE-1', heightU: 12 }, { id: 'r2', name: 'BAIE-2', heightU: 12 }])
  })

  it('redimensionner réévalue l’appartenance de tous les appareils', () => {
    const p = assignZones(withZones(zone('z1', -24, 148, 224, 134)))
    const bigger = resizeZone(p, 'z1', { x: -40, y: -40, w: 400, h: 400 })
    expect(bigger.devices.map((d) => d.zoneId)).toEqual(['z1', 'z1'])
  })

  it('placeDevices rend le même projet si rien ne bouge', () => {
    const p = sampleProject()
    expect(placeDevices(p, [{ id: 'cam1', position: { x: 0, y: 200 } }])).toBe(p)
  })
})

describe('zones imbriquées', () => {
  // A contient B, B contient C (deux niveaux), D ne fait que chevaucher A.
  const nested = (): Project => {
    const base = sampleProject()
    const p: Project = {
      ...base,
      zones: [zone('A', -100, -100, 400, 400), zone('B', -24, 148, 224, 134), zone('C', 0, 150, 100, 60), zone('D', 250, 250, 300, 200)],
      devices: base.devices.map((d) => (d.id === 'sw1' ? { ...d, position: { x: 300, y: 300 } } : d))
    }
    return assignZones(p)
  }

  it('zonesWithin emporte une zone imbriquée et une zone à deux niveaux, pas une zone qui chevauche seulement', () => {
    const map = zonesWithin(nested(), ['A'])
    expect([...map.entries()].sort()).toEqual([['A', 'A'], ['B', 'A'], ['C', 'A']])
  })

  it('déplacer la zone externe déplace les zones imbriquées et leurs appareils, pas la zone qui chevauche', () => {
    const p = nested()
    expect(p.devices.map((d) => d.zoneId)).toEqual(['D', 'B'])
    const q = moveZones(p, [{ id: 'A', dx: 40, dy: 8 }])
    expect(q.zones.map((z) => [z.id, z.rect.x, z.rect.y])).toEqual([['A', -60, -92], ['B', 16, 156], ['C', 40, 158], ['D', 250, 250]])
    expect(q.devices.map((d) => d.position)).toEqual([{ x: 300, y: 300 }, { x: 40, y: 208 }])
  })
})
