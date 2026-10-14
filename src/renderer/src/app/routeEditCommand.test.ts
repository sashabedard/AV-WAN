import { describe, expect, it, vi } from 'vitest'
import { isTextInput, routeUndoRedo } from './routeEditCommand'

const el = (tagName: string, extra: Record<string, unknown> = {}) => ({ tagName, ...extra }) as unknown as Element

describe('routeUndoRedo', () => {
  it("agit sur le texte quand un champ texte a le focus", () => {
    const doc = { execCommand: vi.fn(() => true) }
    const store = { undo: vi.fn(), redo: vi.fn() }
    routeUndoRedo('undo', el('INPUT', { type: 'text' }), doc, store)
    expect(doc.execCommand).toHaveBeenCalledWith('undo')
    expect(store.undo).not.toHaveBeenCalled()
  })

  it('agit sur le projet sinon (case à cocher, canvas)', () => {
    const doc = { execCommand: vi.fn(() => true) }
    const store = { undo: vi.fn(), redo: vi.fn() }
    routeUndoRedo('redo', el('INPUT', { type: 'checkbox' }), doc, store)
    routeUndoRedo('undo', el('DIV'), doc, store)
    expect(store.redo).toHaveBeenCalledOnce()
    expect(store.undo).toHaveBeenCalledOnce()
    expect(isTextInput(el('TEXTAREA'))).toBe(true)
    expect(isTextInput(null)).toBe(false)
  })
})
