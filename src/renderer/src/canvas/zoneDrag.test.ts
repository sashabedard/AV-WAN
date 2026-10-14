import { describe, expect, it } from 'vitest'
import { memberPositions, selectionMoves, startZoneDrag } from './zoneDrag'
import { sampleProject } from '../model/__fixtures__/sample'

function projectWithZone() {
  const p = { ...sampleProject(), zones: [{ id: 'z1', name: 'Salle', color: '#3E8EF7', rect: { x: -24, y: 148, w: 224, h: 134 }, ownPdfPage: false }] }
  p.devices[1] = { ...p.devices[1]!, zoneId: 'z1' }
  return p
}
const zoneAt = (x: number, y: number, id = 'z1') => ({ id, type: 'zone', position: { x, y } })

describe('glisser une zone', () => {
  it('emporte ses membres en direct et donne une seule opération à la fin', () => {
    const zd = startZoneDrag(projectWithZone(), [zoneAt(-24, 148)])!
    expect([...zd.members.keys()]).toEqual(['cam1'])
    expect(memberPositions(zd, [zoneAt(16, 148)]).get('cam1')).toEqual({ x: 40, y: 200 })
    expect(selectionMoves(zd, [zoneAt(16, 148)])).toEqual({ devices: [], zones: [{ id: 'z1', dx: 40, dy: 0 }] })
  })

  it('emporte aussi une zone imbriquée et ses appareils dans l’aperçu', () => {
    const p = projectWithZone()
    p.zones.push({ id: 'z2', name: 'Coin', color: '#3DBE6E', rect: { x: 0, y: 160, w: 100, h: 60 }, ownPdfPage: false })
    p.devices[0] = { ...p.devices[0]!, zoneId: 'z2' }
    const zd = startZoneDrag(p, [zoneAt(-24, 148)])!
    expect(zd.members.get('z2')).toEqual({ zoneId: 'z1', position: { x: 0, y: 160 } })
    const moved = memberPositions(zd, [zoneAt(16, 148)])
    expect(moved.get('z2')).toEqual({ x: 40, y: 160 })
    expect(moved.get(p.devices[0]!.id)).toEqual({ x: p.devices[0]!.position.x + 40, y: p.devices[0]!.position.y })
    expect(selectionMoves(zd, [zoneAt(16, 148)]).zones).toEqual([{ id: 'z1', dx: 40, dy: 0 }])
  })

  it('ne déplace pas deux fois un membre sélectionné avec la zone', () => {
    const cam = { id: 'cam1', type: 'device', position: { x: 0, y: 200 } }
    const zd = startZoneDrag(projectWithZone(), [zoneAt(-24, 148), cam])!
    expect(zd.members.size).toBe(0)
    expect(selectionMoves(zd, [zoneAt(16, 148), { ...cam, position: { x: 40, y: 200 } }]).devices).toEqual([{ id: 'cam1', position: { x: 40, y: 200 } }])
  })

  it('sans zone dans le glisser, rien de spécial', () => {
    const cam = { id: 'cam1', type: 'device', position: { x: 8, y: 200 } }
    expect(startZoneDrag(projectWithZone(), [cam])).toBeNull()
    expect(selectionMoves(null, [cam])).toEqual({ devices: [{ id: 'cam1', position: { x: 8, y: 200 } }], zones: [] })
  })
})
