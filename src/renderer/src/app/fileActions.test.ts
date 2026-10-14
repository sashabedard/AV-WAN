import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AvwanApi } from '../../../shared/api'
import { isDirty, projectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'
import { serializeProject } from '../model/file'
import { fileNameOf, loadFromText, saveProjectAction } from './fileActions'

function fakeApi(file: Partial<AvwanApi['file']> = {}): AvwanApi {
  return {
    platform: 'darwin',
    isE2E: false,
    onMenu: () => () => undefined,
    file: {
      open: vi.fn(async () => null),
      read: vi.fn(async (path: string) => ({ path, text: '' })),
      save: vi.fn(async (path: string) => path),
      saveAs: vi.fn(async () => '/tmp/copie.avwan'),
      backup: vi.fn(async (path: string) => `${path}.bak`),
      ...file
    }
  }
}

beforeEach(() => {
  projectStore.getState().loadProject(sampleProject(), '/tmp/a.avwan')
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fileActions', () => {
  it('enregistre puis marque le projet comme propre', async () => {
    const api = fakeApi()
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    projectStore.getState().updateMeta({ title: 'Mis à jour' })
    await saveProjectAction()
    expect(api.file.save).toHaveBeenCalledWith('/tmp/a.avwan', expect.stringContaining('"title": "Mis à jour"'))
    expect(isDirty(projectStore.getState())).toBe(false)
  })

  it("garde l'état modifié et affiche l'erreur si l'écriture échoue", async () => {
    const api = fakeApi({ save: vi.fn(async () => { throw new Error('EACCES: permission refusée') }) })
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    projectStore.getState().updateMeta({ title: 'X' })
    await saveProjectAction()
    expect(isDirty(projectStore.getState())).toBe(true)
    expect(projectStore.getState().toast).toContain('EACCES')
  })

  it('ouvre en lecture seule un fichier plus récent, sans chemin (Enregistrer sous obligatoire)', async () => {
    vi.stubGlobal('window', { avwan: fakeApi(), confirm: () => true })
    const text = serializeProject(sampleProject()).replace('"schemaVersion": 1', '"schemaVersion": 2')
    expect(await loadFromText('/tmp/futur.avwan', text)).toBe(true)
    expect(projectStore.getState().readOnly).toBe(true)
    expect(projectStore.getState().filePath).toBeNull()
  })

  it("n'ouvre pas un fichier invalide et garde le projet courant", async () => {
    vi.stubGlobal('window', { avwan: fakeApi(), confirm: () => true })
    expect(await loadFromText('/tmp/casse.avwan', '{')).toBe(false)
    expect(projectStore.getState().filePath).toBe('/tmp/a.avwan')
    expect(projectStore.getState().toast).toContain('JSON')
  })

  it('extrait le nom du fichier (macOS et Windows)', () => {
    expect(fileNameOf('/Users/x/lumen.avwan')).toBe('lumen.avwan')
    expect(fileNameOf('C:\\Projets\\lumen.avwan')).toBe('lumen.avwan')
    expect(fileNameOf(null)).toBe('Sans titre')
  })
})
