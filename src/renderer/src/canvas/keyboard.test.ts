import { describe, expect, it } from 'vitest'
import { arrowDelta, nudgeMoves, vmsToDelete } from './keyboard'
import { sampleProject } from '../model/__fixtures__/sample'

describe('flèches', () => {
  it('déplacent de 8 px, ou de 1 px avec Shift', () => {
    expect(arrowDelta('ArrowLeft', false)).toEqual({ dx: -8, dy: 0 })
    expect(arrowDelta('ArrowDown', true)).toEqual({ dx: 0, dy: 1 })
    expect(arrowDelta('a', false)).toBeNull()
  })

  it('calculent les nouvelles positions des appareils sélectionnés seulement', () => {
    const p = sampleProject()
    expect(nudgeMoves(p, ['cam1', 'fantome'], { dx: 8, dy: 0 })).toEqual([{ id: 'cam1', position: { x: 8, y: 200 } }])
  })
})

describe('Suppr sur une VM', () => {
  it('renvoie les VMs sélectionnées, jamais l’hôte', () => {
    expect(vmsToDelete('Delete', { deviceIds: [], linkIds: [], vmIds: ['vm1'] })).toEqual(['vm1'])
    expect(vmsToDelete('Backspace', { deviceIds: [], linkIds: [], vmIds: ['vm1'] })).toEqual(['vm1'])
    expect(vmsToDelete('a', { deviceIds: [], linkIds: [], vmIds: ['vm1'] })).toBeNull()
    expect(vmsToDelete('Delete', { deviceIds: ['h'], linkIds: [] })).toBeNull()
  })
})

