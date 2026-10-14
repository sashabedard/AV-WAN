import { describe, expect, it } from 'vitest'
import type { Project, Zone } from './types'
import { assignZones, createZone, moveZones, nextZoneName, placeDevices, removeZones, resizeZone, zoneAround, zoneAt, ZONE_COLORS } from './zones'
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
