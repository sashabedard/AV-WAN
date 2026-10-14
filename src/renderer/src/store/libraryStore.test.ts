import { describe, expect, it, vi } from 'vitest'
import type { AvwanApi, LibraryFile } from '../../../shared/api'
import type { DeviceTemplate } from '../model/types'
import { blankDraft, templateFromDraft } from '../model/customTemplate'
import { createLibraryStore, parseLibrary } from './libraryStore'

const tpl = (id: string, name: string): DeviceTemplate => templateFromDraft({ ...blankDraft(), name, code: 'X' }, id)
const fileOf = (t: { id: string }): LibraryFile => ({ id: t.id, text: JSON.stringify(t) })
const fakeLibrary = (files: LibraryFile[] = []): AvwanApi['library'] => ({
  list: vi.fn(async () => files),
  save: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined)
})

describe('parseLibrary', () => {
  it('garde les composantes valides, triées par nom, et ignore le reste', () => {
    const a = tpl('custom-aaaaaa', 'Zèbre')
    const b = tpl('custom-bbbbbb', 'Antenne')
    const files = [
      fileOf(a),
      fileOf(b),
      { id: 'custom-cccccc', text: '{pas du json' },
      { id: 'custom-dddddd', text: JSON.stringify({ ...a, id: 'custom-autre0' }) },
      { id: 'custom-eeeeee', text: JSON.stringify({ name: 'incomplet' }) }
    ]
    expect(parseLibrary(files).map((t) => t.name)).toEqual(['Antenne', 'Zèbre'])
  })

  it('refuse un switch', () => {
    const sw = { ...tpl('custom-ffffff', 'Switch perso'), switch: { portCount: 8, poe: 'none', sfpPlus: 0, managed: false } }
    expect(parseLibrary([fileOf(sw)])).toEqual([])
  })
})

describe('libraryStore', () => {
  it('charge, enregistre, remplace et supprime', async () => {
    const a = tpl('custom-aaaaaa', 'Antenne')
    const api = fakeLibrary([fileOf(a)])
    const store = createLibraryStore(() => api)
    await store.getState().load()
    expect(store.getState().templates).toEqual([a])
    const b = tpl('custom-bbbbbb', 'Balise')
    await store.getState().save(b)
    expect(api.save).toHaveBeenCalledWith('custom-bbbbbb', expect.stringContaining('"name": "Balise"'))
    const a2 = { ...a, id: 'custom-a2a2a2', name: 'Antenne v2' }
    await store.getState().replace(a.id, a2)
    expect(api.remove).toHaveBeenCalledWith('custom-aaaaaa')
    expect(store.getState().templates.map((t) => t.id)).toEqual(['custom-a2a2a2', 'custom-bbbbbb'])
    await store.getState().remove('custom-bbbbbb')
    expect(store.getState().templates.map((t) => t.id)).toEqual(['custom-a2a2a2'])
  })

  it('n’ajoute rien si l’écriture échoue', async () => {
    const api = fakeLibrary()
    vi.mocked(api.save).mockRejectedValue(new Error('disque plein'))
    const store = createLibraryStore(() => api)
    await expect(store.getState().save(tpl('custom-bbbbbb', 'Balise'))).rejects.toThrow('disque plein')
    expect(store.getState().templates).toEqual([])
  })
})
