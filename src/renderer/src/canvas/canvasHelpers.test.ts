import { describe, expect, it } from 'vitest'
import { mergeEdges, mergeNodes, nodesMatchDerived, snapPoint } from './canvasHelpers'
import type { CordFlowEdge, DeviceFlowNode } from './toFlow'

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
})
