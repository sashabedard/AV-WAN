import { describe, expect, it } from 'vitest'
import { messages } from '../../../shared/i18n/messages'
import { sampleProject } from './__fixtures__/sample'
import { addRack, firstFreeU, fitsAt, placeDevice, rackDevices, removeRack, setDeviceHeightU, unplaceDevice, updateRack } from './racks'
import { DeviceSchema } from './schema'
import type { Project } from './types'

const fr = messages('fr')

// Baie 12U : A (1U) en U1, B (2U) en U2-3 ; C libre
function base(): Project {
  const s = sampleProject()
  const [a, b] = s.devices
  const c = { ...b!, id: 'c', name: 'C' }
  let p: Project = { ...s, devices: [a!, b!, c] }
  p = addRack(p, fr, { heightU: 12 }, () => 'r1').project
  p = placeDevice(p, a!.id, 'r1', 1, 1)!
  p = placeDevice(p, b!.id, 'r1', 2, 2)!
  return p
}
const [A, B] = ['sw1', 'cam1']

describe('racks', () => {
  it('fitsAt / firstFreeU', () => {
    const p = base()
    expect(fitsAt(p, 'r1', 3, 1)).toBe(false)
    expect(fitsAt(p, 'r1', 4, 1)).toBe(true)
    expect(fitsAt(p, 'r1', 12, 2)).toBe(false)
    expect(fitsAt(p, 'r1', 2, 2, B)).toBe(true)
    expect(firstFreeU(p, 'r1', 2)).toBe(4)
    expect(firstFreeU(p, 'r1', 13)).toBeUndefined()
  })

  it('placeDevice refuse un chevauchement, unplaceDevice retire', () => {
    const p = base()
    expect(placeDevice(p, 'c', 'r1', 3)).toBeNull()
    expect(placeDevice(p, 'c', 'r1', 4)!.devices.find((d) => d.id === 'c')!.rack).toEqual({ rackId: 'r1', u: 4, heightU: 1 })
    expect(unplaceDevice(p, A).devices.find((d) => d.id === A)!.rack).toBeUndefined()
    expect(rackDevices(p, 'r1').map((d) => d.id)).toEqual([A, B])
  })

  it('updateRack refuse une hauteur trop petite', () => {
    const p = base()
    expect(updateRack(p, 'r1', { heightU: 2 })).toBeNull()
    expect(updateRack(p, 'r1', { heightU: 3 })!.racks![0]!.heightU).toBe(3)
    expect(updateRack(p, 'r1', { name: 'X', zoneId: 'z' })!.racks![0]).toMatchObject({ name: 'X', zoneId: 'z' })
    expect(updateRack(updateRack(p, 'r1', { zoneId: 'z' })!, 'r1', { zoneId: null })!.racks![0]!.zoneId).toBeUndefined()
  })

  it('removeRack détache les appareils et garde les câbles', () => {
    const p = base()
    const r = removeRack(p, 'r1')
    expect(r.racks).toEqual([])
    expect(r.devices.every((d) => d.rack === undefined)).toBe(true)
    expect(r.links).toEqual(p.links)
  })

  it('addRack numérote BAIE-n / RACK-n', () => {
    let p = sampleProject()
    p = addRack(p, fr).project
    p = addRack(p, fr).project
    expect(p.racks!.map((r) => r.name)).toEqual(['BAIE-1', 'BAIE-2'])
    expect(p.racks![0]!.heightU).toBe(12)
    expect(addRack(sampleProject(), messages('en')).project.racks![0]!.name).toBe('RACK-1')
  })

  it('setDeviceHeightU', () => {
    let p = placeDevice(base(), 'c', 'r1', 4)!
    expect(setDeviceHeightU(p, B, 3)).toBeNull()
    expect(setDeviceHeightU(p, 'c', 1)).not.toBeNull()
    p = unplaceDevice(p, 'c')
    expect(setDeviceHeightU(p, B, 3)!.devices.find((d) => d.id === B)!.rack).toEqual({ rackId: 'r1', u: 2, heightU: 3 })
    expect(setDeviceHeightU(p, 'c', 2)).toBeNull() // pas placé
  })

  it('schéma : rack absent accepté, heightU 0 refusé', () => {
    const d = sampleProject().devices[0]!
    expect(DeviceSchema.safeParse(d).success).toBe(true)
    expect(DeviceSchema.safeParse({ ...d, rack: { rackId: 'r', u: 1, heightU: 0 } }).success).toBe(false)
    expect(DeviceSchema.safeParse({ ...d, rack: { rackId: 'r', u: 1, heightU: 2 } }).success).toBe(true)
  })
})
