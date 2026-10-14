import { describe, expect, it } from 'vitest'
import { mergeEdges, mergeNodes, snapPoint } from './canvasHelpers'
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
})
