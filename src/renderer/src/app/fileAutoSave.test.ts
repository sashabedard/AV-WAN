// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import type { AvwanApi } from '../../../shared/api'
import { createProjectStore, isDirty, projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { sampleProject } from '../model/__fixtures__/sample'
import { serializeProject } from '../model/file'
import { pruneTemplates } from '../model/customTemplate'
import { createFileAutoSave, FILE_AUTOSAVE_DELAY_MS, fileAutoSave, useFileAutoSave, type FileAutoSave, type FileAutoSaveDeps } from './fileAutoSave'
import { useDocumentTitle } from './useDocumentTitle'

let controller: FileAutoSave | null = null

// Un vrai store, des dépendances simulées : l'écriture rend le chemin écrit, comme file.save.
function setup(filePath: string | null = '/x/a.avwan', overrides: Partial<FileAutoSaveDeps> = {}) {
  const store = createProjectStore()
  store.getState().loadProject(sampleProject(), filePath)
  let on = true
  const deps = {
    enabled: vi.fn(() => on),
    save: vi.fn(async (path: string, _text: string) => path),
    saveSync: vi.fn((_path: string, _text: string): { ok: boolean; error?: string } => ({ ok: true })),
    createDefault: vi.fn(async (_title: string, _text: string) => '/Users/x/Documents/AV·WAN/Salle B.avwan'),
    onSaved: vi.fn(),
    toast: vi.fn()
  } satisfies FileAutoSaveDeps
  const auto = createFileAutoSave(store, { ...deps, ...overrides })
  controller = auto
  return { store, deps, auto, setEnabled: (v: boolean) => (on = v) }
}

// Écritures retenues : chaque appel attend qu'on le libère, dans l'ordre.
function heldSaves() {
  const pending: Array<() => void> = []
  const save = vi.fn((path: string, _text: string) => new Promise<string>((resolve) => pending.push(() => resolve(path))))
  return { save, release: () => pending.shift()?.() }
}

const textOf = (p: Parameters<typeof pruneTemplates>[0]): string => serializeProject(pruneTemplates(p))

afterEach(() => {
  controller?.stop()
  controller = null
  vi.useRealTimers()
  cleanup()
})

describe('écriture automatique dans le fichier', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('écrit 2 s après une modification, puis le projet n’est plus modifié', async () => {
    expect(FILE_AUTOSAVE_DELAY_MS).toBe(2000)
    const { store, deps } = setup()
    store.getState().updateMeta({ title: 'Salle B' })
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS - 1)
    expect(deps.save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(deps.save).toHaveBeenCalledTimes(1)
    expect(deps.save).toHaveBeenCalledWith('/x/a.avwan', textOf(store.getState().history.present))
    expect(isDirty(store.getState())).toBe(false)
    expect(deps.onSaved).toHaveBeenCalledTimes(1)
    expect(deps.toast).not.toHaveBeenCalled()
  })

  it('des modifications toutes les secondes : une seule écriture, 2 s après la dernière', async () => {
    const { store, deps } = setup()
    for (let i = 0; i <= 5; i++) {
      store.getState().updateMeta({ revision: `R${i}` })
      if (i < 5) await vi.advanceTimersByTimeAsync(1000)
    }
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS - 1)
    expect(deps.save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(deps.save).toHaveBeenCalledTimes(1)
    expect(deps.save.mock.calls[0]![1]).toContain('"revision": "R5"')
  })

  it('un message ou une sélection ne relance pas le délai', async () => {
    const { store, deps } = setup()
    store.getState().updateMeta({ title: 'Salle B' })
    await vi.advanceTimersByTimeAsync(1500)
    store.getState().showToast('Bonjour')
    store.getState().setSelection({ deviceIds: ['cam1'], linkIds: [] })
    await vi.advanceTimersByTimeAsync(500)
    expect(deps.save).toHaveBeenCalledTimes(1)
  })

  it('flush() (perte de focus) écrit tout de suite et annule le minuteur', async () => {
    const { store, deps, auto } = setup()
    store.getState().updateMeta({ title: 'Salle B' })
    expect(vi.getTimerCount()).toBe(1)
    await auto.flush()
    expect(deps.save).toHaveBeenCalledTimes(1)
    expect(isDirty(store.getState())).toBe(false)
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS * 2)
    expect(deps.save).toHaveBeenCalledTimes(1)
  })

  it('case décochée : aucune écriture, même à la perte de focus', async () => {
    const { store, deps, auto, setEnabled } = setup()
    setEnabled(false)
    store.getState().updateMeta({ title: 'Salle B' })
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS * 2)
    await auto.flush()
    expect(deps.save).not.toHaveBeenCalled()
    expect(isDirty(store.getState())).toBe(true)
  })

  it('case décochée pendant le délai : rien n’est écrit à l’échéance', async () => {
    const { store, deps, setEnabled } = setup()
    store.getState().updateMeta({ title: 'Salle B' })
    setEnabled(false)
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    expect(deps.save).not.toHaveBeenCalled()
  })

  it('lecture seule : aucune écriture', async () => {
    const { store, deps, auto } = setup()
    // Copie restaurée d'une version plus récente : modifiée (rien d'enregistré) mais en lecture seule.
    store.getState().loadProject(sampleProject(), '/x/a.avwan', { readOnly: true, restored: true })
    store.getState().updateMeta({ title: 'Refusé' })
    store.getState().setColorMode('type')
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS * 2)
    await auto.flush()
    expect(deps.save).not.toHaveBeenCalled()
    expect(deps.createDefault).not.toHaveBeenCalled()
  })

  it('projet sans chemin : le fichier est créé dans Documents › AV·WAN, puis les écritures y vont', async () => {
    const { store, deps } = setup(null)
    store.getState().updateMeta({ title: 'Salle B' })
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    expect(deps.save).not.toHaveBeenCalled()
    expect(deps.createDefault).toHaveBeenCalledWith('Salle B', textOf(store.getState().history.present))
    expect(store.getState().filePath).toBe('/Users/x/Documents/AV·WAN/Salle B.avwan')
    expect(isDirty(store.getState())).toBe(false)
    expect(deps.onSaved).toHaveBeenCalledTimes(1)
    expect(deps.toast).toHaveBeenCalledWith('Enregistré dans Documents › AV·WAN › Salle B.avwan')
    store.getState().updateMeta({ revision: 'B' })
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    expect(deps.createDefault).toHaveBeenCalledTimes(1)
    expect(deps.save).toHaveBeenCalledWith('/Users/x/Documents/AV·WAN/Salle B.avwan', expect.stringContaining('"revision": "B"'))
  })

  it('échecs répétés : un seul message par série ; une réussite remet le compteur à zéro', async () => {
    const fail = () => new Error("Error invoking remote method 'file:save': Error: Disque plein (ENOSPC).")
    const save = vi
      .fn((path: string, _text: string) => Promise.resolve(path))
      .mockRejectedValueOnce(fail())
      .mockRejectedValueOnce(fail())
      .mockResolvedValueOnce('/x/a.avwan')
      .mockRejectedValueOnce(fail())
    const { store, deps } = setup('/x/a.avwan', { save })
    const change = async (rev: string): Promise<void> => {
      store.getState().updateMeta({ revision: rev })
      await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    }
    await change('1')
    expect(deps.toast).toHaveBeenCalledTimes(1)
    expect(deps.toast).toHaveBeenCalledWith('Enregistrement automatique impossible : Disque plein (ENOSPC).')
    expect(isDirty(store.getState())).toBe(true)
    expect(deps.onSaved).not.toHaveBeenCalled()
    await change('2')
    expect(save).toHaveBeenCalledTimes(2)
    expect(deps.toast).toHaveBeenCalledTimes(1)
    await change('3')
    expect(isDirty(store.getState())).toBe(false)
    expect(deps.toast).toHaveBeenCalledTimes(1)
    await change('4')
    expect(save).toHaveBeenCalledTimes(4)
    expect(deps.toast).toHaveBeenCalledTimes(2)
    expect(deps.toast).toHaveBeenLastCalledWith(expect.stringMatching(/^Enregistrement automatique impossible : /))
  })

  it('modification pendant une écriture : une seule écriture à la fois, puis la nouvelle version part', async () => {
    const held = heldSaves()
    const { store, deps } = setup('/x/a.avwan', { save: held.save })
    store.getState().updateMeta({ title: 'B' })
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    expect(held.save).toHaveBeenCalledTimes(1)
    const written = store.getState().history.present
    store.getState().updateMeta({ title: 'C' })
    // Le délai échoit pendant l'écriture : pas de deuxième écriture en parallèle.
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    expect(held.save).toHaveBeenCalledTimes(1)
    held.release()
    await vi.advanceTimersByTimeAsync(0)
    // La version écrite est marquée enregistrée, mais le projet a bougé : il reste modifié.
    expect(store.getState().savedRef).toBe(written)
    expect(isDirty(store.getState())).toBe(true)
    expect(held.save).toHaveBeenCalledTimes(2)
    expect(held.save.mock.calls[1]![1]).toContain('"title": "C"')
    held.release()
    await vi.advanceTimersByTimeAsync(0)
    expect(isDirty(store.getState())).toBe(false)
    expect(deps.onSaved).toHaveBeenCalledTimes(2)
  })

  it('modification pendant une écriture qui finit avant le délai : le minuteur écrit la suite', async () => {
    const held = heldSaves()
    const { store } = setup('/x/a.avwan', { save: held.save })
    store.getState().updateMeta({ title: 'B' })
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    store.getState().updateMeta({ title: 'C' })
    held.release()
    await vi.advanceTimersByTimeAsync(0)
    expect(isDirty(store.getState())).toBe(true)
    expect(held.save).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    expect(held.save).toHaveBeenCalledTimes(2)
    held.release()
    await vi.advanceTimersByTimeAsync(0)
    expect(isDirty(store.getState())).toBe(false)
  })

  it('changement de document : le minuteur en attente est annulé', async () => {
    const { store, deps } = setup()
    store.getState().updateMeta({ title: 'Salle B' })
    // Copie restaurée (modifiée) : un minuteur oublié l'écrirait.
    store.getState().loadProject(sampleProject(), '/x/b.avwan', { restored: true })
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS * 2)
    expect(deps.save).not.toHaveBeenCalled()
  })

  it('changement de document pendant une écriture : le nouveau document n’est ni marqué enregistré ni écrit', async () => {
    const held = heldSaves()
    const { store, deps, auto } = setup('/x/a.avwan', { save: held.save })
    store.getState().updateMeta({ title: 'Salle B' })
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    store.getState().updateMeta({ title: 'Salle C' })
    void auto.flush() // demande faite pour l'ancien document, pendant l'écriture
    store.getState().loadProject(sampleProject(), '/x/b.avwan', { restored: true })
    held.release()
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    expect(store.getState().filePath).toBe('/x/b.avwan')
    expect(isDirty(store.getState())).toBe(true)
    expect(deps.onSaved).not.toHaveBeenCalled()
    expect(held.save).toHaveBeenCalledTimes(1)
  })

  it('demande faite pour le nouveau document pendant l’écriture de l’ancien : elle part ensuite', async () => {
    const held = heldSaves()
    const { store } = setup('/x/a.avwan', { save: held.save })
    store.getState().updateMeta({ title: 'Salle B' })
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS)
    store.getState().loadProject(sampleProject(), '/x/b.avwan')
    store.getState().updateMeta({ title: 'Autre' })
    await vi.advanceTimersByTimeAsync(FILE_AUTOSAVE_DELAY_MS) // le délai du nouveau document échoit pendant l'écriture
    expect(held.save).toHaveBeenCalledTimes(1)
    held.release()
    await vi.advanceTimersByTimeAsync(0)
    expect(held.save).toHaveBeenCalledTimes(2)
    expect(held.save.mock.calls[1]![0]).toBe('/x/b.avwan')
    expect(held.save.mock.calls[1]![1]).toContain('"title": "Autre"')
    held.release()
    await vi.advanceTimersByTimeAsync(0)
    expect(isDirty(store.getState())).toBe(false)
  })
})

describe('flushSync (fermeture de la fenêtre)', () => {
  it('modifié avec un chemin : écriture synchrone, projet marqué enregistré, rend true', () => {
    const { store, deps, auto } = setup()
    store.getState().updateMeta({ title: 'Salle B' })
    expect(auto.flushSync()).toBe(true)
    expect(deps.saveSync).toHaveBeenCalledWith('/x/a.avwan', textOf(store.getState().history.present))
    expect(isDirty(store.getState())).toBe(false)
    expect(deps.onSaved).toHaveBeenCalledTimes(1)
  })

  it('écriture synchrone en échec : rend false, le projet reste modifié', () => {
    const saveSync = vi.fn(() => ({ ok: false, error: 'Disque plein (ENOSPC).' }))
    const { store, deps, auto } = setup('/x/a.avwan', { saveSync })
    store.getState().updateMeta({ title: 'Salle B' })
    expect(auto.flushSync()).toBe(false)
    expect(saveSync).toHaveBeenCalledTimes(1)
    expect(isDirty(store.getState())).toBe(true)
    expect(deps.onSaved).not.toHaveBeenCalled()
  })

  it('rien à écrire : rend true sans écrire', () => {
    const { deps, auto } = setup()
    expect(auto.flushSync()).toBe(true)
    expect(deps.saveSync).not.toHaveBeenCalled()
  })

  it('sans chemin : rend false (la question habituelle), rien n’est créé', () => {
    const { store, deps, auto } = setup(null)
    store.getState().updateMeta({ title: 'Salle B' })
    expect(auto.flushSync()).toBe(false)
    expect(deps.saveSync).not.toHaveBeenCalled()
    expect(deps.createDefault).not.toHaveBeenCalled()
  })

  it('une écriture plus ancienne encore en cours pourrait écraser la nouvelle : rend false', async () => {
    vi.useFakeTimers()
    const held = heldSaves()
    const { store, deps, auto } = setup('/x/a.avwan', { save: held.save })
    store.getState().updateMeta({ title: 'Salle B' })
    void auto.flush()
    // Même version que celle en cours d'écriture : rien ne peut être perdu.
    expect(auto.flushSync()).toBe(true)
    store.getState().updateMeta({ title: 'Salle C' })
    expect(auto.flushSync()).toBe(false)
    expect(deps.saveSync).toHaveBeenCalledTimes(1)
    held.release()
    await vi.advanceTimersByTimeAsync(0)
  })

  it('case décochée ou lecture seule : rend false sans écrire', () => {
    const { store, deps, auto, setEnabled } = setup()
    store.getState().updateMeta({ title: 'Salle B' })
    setEnabled(false)
    expect(auto.flushSync()).toBe(false)
    setEnabled(true)
    store.getState().loadProject(sampleProject(), '/x/a.avwan', { readOnly: true, restored: true })
    expect(auto.flushSync()).toBe(false)
    expect(deps.saveSync).not.toHaveBeenCalled()
  })
})

describe('branchements dans l’app', () => {
  it('useFileAutoSave écrit à la perte de focus de la fenêtre, et se retire au démontage', () => {
    const flush = vi.spyOn(fileAutoSave, 'flush').mockResolvedValue(undefined)
    const { unmount } = renderHook(() => useFileAutoSave())
    window.dispatchEvent(new Event('blur'))
    expect(flush).toHaveBeenCalledTimes(1)
    unmount()
    window.dispatchEvent(new Event('blur'))
    expect(flush).toHaveBeenCalledTimes(1)
    flush.mockRestore()
  })

  describe('fermeture (onbeforeunload)', () => {
    beforeEach(() => {
      window.avwan = { isE2E: false } as AvwanApi
      uiStore.getState().setAutoSave(false) // le minuteur de l'instance de l'app reste éteint
      projectStore.getState().loadProject(sampleProject(), '/x/a.avwan')
    })
    afterEach(() => {
      cleanup() // démonter avant de remettre le store et window.avwan à zéro
      window.onbeforeunload = null
      uiStore.getState().setAutoSave(true)
      projectStore.getState().newProject()
      Reflect.deleteProperty(window, 'avwan')
    })

    const close = (): { prevented: boolean; result: unknown } => {
      const e = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent
      const result = (window.onbeforeunload as ((e: BeforeUnloadEvent) => unknown) | null)?.(e)
      return { prevented: e.defaultPrevented, result }
    }

    it('écriture synchrone réussie : la fenêtre se ferme sans question', () => {
      const flushSync = vi.spyOn(fileAutoSave, 'flushSync').mockReturnValue(true)
      projectStore.getState().updateMeta({ title: 'Salle B' })
      renderHook(() => useDocumentTitle())
      expect(close()).toEqual({ prevented: false, result: undefined })
      expect(flushSync).toHaveBeenCalledTimes(1)
      flushSync.mockRestore()
    })

    it('écriture synchrone impossible : la question habituelle revient', () => {
      const flushSync = vi.spyOn(fileAutoSave, 'flushSync').mockReturnValue(false)
      projectStore.getState().updateMeta({ title: 'Salle B' })
      renderHook(() => useDocumentTitle())
      expect(close()).toEqual({ prevented: true, result: '' })
      flushSync.mockRestore()
    })
  })
})
