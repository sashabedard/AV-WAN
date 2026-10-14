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

  it('garde une copie de sauvegarde quand des câbles invalides sont retirés', async () => {
    const backup = vi.fn(async (path: string) => path.replace(/\.avwan$/, '.bak.avwan'))
    const api = fakeApi({ backup })
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    const p = sampleProject()
    p.links.push({ id: 'l2', cableId: 'C-002', a: { deviceId: 'fantome', portId: 'ETH' }, b: { deviceId: 'sw1', portId: '2' }, medium: 'cat6' })
    expect(await loadFromText('/tmp/orphelin.avwan', serializeProject(p))).toBe(true)
    expect(backup).toHaveBeenCalledTimes(1)
    expect(backup).toHaveBeenCalledWith('/tmp/orphelin.avwan')
    expect(projectStore.getState().history.present.links).toHaveLength(1)
    expect(projectStore.getState().toast).toContain('C-002')
    expect(projectStore.getState().toast).toContain('Copie de sauvegarde conservée : orphelin.bak.avwan')
  })

  it('ne fait pas de copie de sauvegarde pour un fichier sain', async () => {
    const api = fakeApi()
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    expect(await loadFromText('/tmp/sain.avwan', serializeProject(sampleProject()))).toBe(true)
    expect(api.file.backup).not.toHaveBeenCalled()
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
