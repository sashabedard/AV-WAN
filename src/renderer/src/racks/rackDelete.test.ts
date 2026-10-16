import { describe, expect, it } from 'vitest'
import { rackViewDelete } from './rackDelete'

describe('rackViewDelete', () => {
  it('un appareil quitte sa baie, un câble et une baie sont supprimés', () => {
    expect(rackViewDelete({ deviceIds: ['a'], linkIds: ['l1'], rackIds: ['r'] })).toEqual({ unplace: ['a'], removeLinks: ['l1'], removeRacks: ['r'] })
  })
  it('sans baie sélectionnée : removeRacks est vide', () => {
    expect(rackViewDelete({ deviceIds: [], linkIds: ['l1'] })).toEqual({ unplace: [], removeLinks: ['l1'], removeRacks: [] })
  })
})
