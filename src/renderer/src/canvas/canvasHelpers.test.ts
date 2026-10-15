import { describe, expect, it } from 'vitest'
import { deviceIpLine, deviceSecondLine, mergeEdges, mergeNodes, nodesMatchDerived, snapPoint, syncSelected } from './canvasHelpers'
import type { CordFlowEdge, DeviceFlowNode } from './toFlow'
import { patchIndex } from '../model/dmx'
import { createDevice, createProject } from '../model/project'

const node = (id: string, extra: Partial<DeviceFlowNode> = {}) =>
  ({ id, type: 'device', position: { x: 0, y: 0 }, data: {} as DeviceFlowNode['data'], ...extra }) as DeviceFlowNode

describe('canvasHelpers', () => {
  it('aligne sur la grille de 8 px, sauf si désactivé', () => {
    expect(snapPoint({ x: 13, y: 21 }, true)).toEqual({ x: 16, y: 24 })
    expect(snapPoint({ x: 13, y: 21 }, false)).toEqual({ x: 13, y: 21 })
  })

  it('conserve les dimensions mesurées et la sélection locale', () => {
    const derived = [node('a'), node('b')]
    const prev = [node('a', { measured: { width: 176, height: 58 }, selected: true })]
    const merged = mergeNodes(derived, prev)
    expect(merged[0]).toMatchObject({ measured: { width: 176, height: 58 }, selected: true })
    expect(merged[1]).toBe(derived[1])
  })

  it('conserve la sélection des câbles', () => {
    const e = (id: string, selected?: boolean) => ({ id, source: 'a', target: 'b', ...(selected ? { selected } : {}) }) as CordFlowEdge
    const merged = mergeEdges([e('x'), e('y')], [e('x', true)])
    expect(merged[0]!.selected).toBe(true)
    expect(merged[1]!.selected).toBeUndefined()
  })

  it('reconnaît quand les nœuds de React Flow correspondent au projet dérivé', () => {
    const a = node('a')
    const b = node('b')
    expect(nodesMatchDerived([a, b], [a, b])).toBe(true)
    expect(nodesMatchDerived([a], [node('c', { position: a.position })])).toBe(false)
    expect(nodesMatchDerived([a], [{ ...a, position: { x: 0, y: 0 } }])).toBe(false)
    expect(nodesMatchDerived([a, b], [a])).toBe(false)
  })

  it('aligne la sélection locale sur celle du store sans recréer ce qui ne change pas', () => {
    const items = [node('a'), node('b', { selected: true })]
    const synced = syncSelected(items, new Set(['a']))
    expect(synced.map((n) => n.selected)).toEqual([true, false])
    expect(syncSelected(synced, new Set(['a']))).toBe(synced)
  })
})

describe('deviceIpLine', () => {
  it('dit DHCP quand l’appareil en DHCP n’a pas d’adresse, comme les fiches', () => {
    expect(deviceIpLine({ address: '', mode: 'dhcp' })).toBe('DHCP')
    expect(deviceIpLine({ address: '10.0.0.5', mode: 'dhcp' })).toBe('10.0.0.5 · DHCP')
    expect(deviceIpLine({ address: '10.0.0.5', mode: 'static' })).toBe('10.0.0.5 · FIXE')
    expect(deviceIpLine({ address: '', mode: 'static' })).toBe('IP non définie')
    expect(deviceIpLine(undefined)).toBe('IP non définie')
  })
})

describe('deviceSecondLine', () => {
  it('l’adresse remplace l’IP d’un appareil patchable ; l’IP reste pour les autres', () => {
    let p = createProject()
    const f = { ...createDevice(p, 'dmx-fixture', { x: 0, y: 0 }, { id: 'f' }), dmx: { footprint: 16, address: 33, universe: 0 } }
    const cam = { ...createDevice(p, 'ip-camera', { x: 0, y: 0 }, { id: 'c' }), ip: { address: '10.70.0.5', mode: 'static' as const } }
    p = { ...p, devices: [f, cam] }
    const index = patchIndex(p)
    expect(deviceSecondLine(f, index.entries.get('f'))).toBe('U0 · 33')
    expect(deviceSecondLine(cam, undefined)).toBe('10.70.0.5 · FIXE')
  })
})
