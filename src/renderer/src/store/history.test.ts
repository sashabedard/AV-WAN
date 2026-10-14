import { describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, canRedo, canUndo, commit, initHistory, redo, undo } from './history'

describe('history', () => {
  it('annule et rétablit', () => {
    let h = initHistory(1)
    h = commit(h, 2)
    h = commit(h, 3)
    h = undo(h)
    expect(h.present).toBe(2)
    expect(canRedo(h)).toBe(true)
    h = redo(h)
    expect(h.present).toBe(3)
  })

  it("un nouveau commit efface le futur et un commit identique n'ajoute rien", () => {
    let h = commit(commit(initHistory('a'), 'b'), 'c')
    h = undo(h)
    h = commit(h, 'x')
    expect(canRedo(h)).toBe(false)
    expect(commit(h, h.present)).toBe(h)
  })

  it('limite la taille du passé', () => {
    let h = initHistory(0)
    for (let i = 1; i <= HISTORY_LIMIT + 50; i++) h = commit(h, i)
    expect(h.past).toHaveLength(HISTORY_LIMIT)
    expect(canUndo(initHistory(0))).toBe(false)
  })
})
