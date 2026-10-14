import { describe, expect, it, vi } from 'vitest'
import { createProjectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'
import { createAutosave, type RecoveryBridge } from './autosave'

function setup(filePath: string | null = '/x/a.avwan') {
  const store = createProjectStore()
  store.getState().loadProject(sampleProject(), filePath)
  // Fausse écriture : la clé dépend du chemin, ou de l'identifiant sans titre, comme dans le processus principal.
  const api = {
    write: vi.fn(async (doc: { path: string | null; untitledId: string }) => (doc.path ? 'f-chemin0000000001' : `u-${doc.untitledId}`)),
    discard: vi.fn(async () => undefined)
  } satisfies RecoveryBridge
  const autosave = createAutosave(store, api)
  return { store, api, autosave }
}

describe('autosauvegarde', () => {
  it('n’écrit rien tant que le projet n’est pas modifié', async () => {
    const { api, autosave } = setup()
    await autosave.tick()
    expect(api.write).not.toHaveBeenCalled()
  })

  it('écrit une fois par version, avec le chemin, le titre et l’identifiant sans titre', async () => {
    const { store, api, autosave } = setup()
    store.getState().updateMeta({ title: 'Salle B' })
    await autosave.tick()
    await autosave.tick()
    expect(api.write).toHaveBeenCalledTimes(1)
    expect(api.write).toHaveBeenCalledWith(expect.objectContaining({ path: '/x/a.avwan', title: 'Salle B', untitledId: store.getState().untitledId, text: expect.stringContaining('"title": "Salle B"') }))
    store.getState().updateMeta({ title: 'Salle C' })
    await autosave.tick()
    expect(api.write).toHaveBeenCalledTimes(2)
  })

  it('un fichier en lecture seule est rangé sans chemin', async () => {
    const { store, api, autosave } = setup()
    store.getState().loadProject(sampleProject(), '/x/a.avwan', { readOnly: true, restored: true })
    await autosave.tick()
    expect(api.write).toHaveBeenCalledWith(expect.objectContaining({ path: null }))
  })

  it('après un enregistrement, la copie est effacée', async () => {
    const { store, api, autosave } = setup()
    store.getState().updateMeta({ title: 'Salle B' })
    await autosave.tick()
    const key = await api.write.mock.results[0]!.value
    store.getState().markSaved('/x/a.avwan')
    autosave.saved()
    expect(api.discard).toHaveBeenCalledWith(key)
  })

  it('au changement de document, la copie du document quitté est effacée', async () => {
    const { store, api, autosave } = setup()
    store.getState().updateMeta({ title: 'Salle B' })
    await autosave.tick()
    const key = await api.write.mock.results[0]!.value
    store.getState().newProject()
    expect(api.discard).toHaveBeenCalledWith(key)
  })

  it('une copie écrite après l’enregistrement est effacée aussitôt', async () => {
    const { store, api, autosave } = setup()
    let release: (key: string) => void = () => undefined
    api.write.mockImplementationOnce(() => new Promise<string>((resolve) => (release = resolve)))
    store.getState().updateMeta({ title: 'Salle B' })
    const pending = autosave.tick()
    store.getState().markSaved('/x/a.avwan')
    autosave.saved()
    release('f-tardive0000000a')
    await pending
    expect(api.discard).toHaveBeenCalledWith('f-tardive0000000a')
  })

  it('une clé adoptée (restauration) est effacée si la copie change de clé', async () => {
    const { store, api, autosave } = setup(null)
    autosave.adopt('f-ancienne0000000')
    store.getState().updateMeta({ title: 'Restaurée' })
    await autosave.tick()
    expect(api.discard).toHaveBeenCalledWith('f-ancienne0000000')
  })
})
