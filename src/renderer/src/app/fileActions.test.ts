import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AvwanApi } from '../../../shared/api'
import { isDirty, projectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'
import { serializeProject } from '../model/file'
import { fileNameOf, loadFromText, openProjectAction, openRequestAction, saveProjectAction } from './fileActions'
import { uiStore } from '../store/uiStore'

function fakeApi(file: Partial<AvwanApi['file']> = {}): AvwanApi {
  return {
    platform: 'darwin',
    isE2E: false,
    onMenu: () => () => undefined,
    onOpenRequest: () => () => undefined,
    rendererReady: vi.fn(),
    recent: {
      list: vi.fn(async () => []),
      open: vi.fn(async (path: string) => ({ path, text: '' })),
      remember: vi.fn(async () => undefined)
    },
    export: { pdf: vi.fn(async () => null), csv: vi.fn(async () => null), xlsx: vi.fn(async () => null) },
    print: { job: vi.fn(async () => ({ projectText: '', options: { sections: [], format: 'na' as const, zonePages: false } })), ready: vi.fn(), failed: vi.fn() },
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

  it('ne mémorise un fichier récent qu’après une ouverture valide', async () => {
    const api = fakeApi()
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    expect(await loadFromText('/x/casse.avwan', 'pas du json')).toBe(false)
    expect(api.recent.remember).not.toHaveBeenCalled()
    expect(await loadFromText('/x/bon.avwan', serializeProject(sampleProject()))).toBe(true)
    expect(api.recent.remember).toHaveBeenCalledWith('/x/bon.avwan')
  })

  it('montre une erreur d’ouverture sans le préfixe IPC d’Electron', async () => {
    const api = fakeApi({ open: vi.fn(async () => Promise.reject(new Error("Error invoking remote method 'file:open': Error: Accès refusé (EACCES)."))) })
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    await openProjectAction()
    expect(projectStore.getState().toast).toBe('Ouverture impossible : Accès refusé (EACCES).')
  })
})

describe('openRequestAction (double-clic)', () => {
  it('ouvre le fichier et ferme l’accueil', async () => {
    vi.stubGlobal('window', { avwan: fakeApi(), confirm: () => true })
    uiStore.getState().setWelcome(true)
    const project = { ...sampleProject(), meta: { ...sampleProject().meta, title: 'Salle B' } }
    expect(await openRequestAction({ path: '/x/salle-b.avwan', text: serializeProject(project) })).toBe(true)
    expect(projectStore.getState().filePath).toBe('/x/salle-b.avwan')
    expect(projectStore.getState().history.present.meta.title).toBe('Salle B')
    expect(uiStore.getState().welcome).toBe(false)
  })

  it('demande avant de remplacer un projet modifié, et ne touche à rien si on refuse', async () => {
    vi.stubGlobal('window', { avwan: fakeApi(), confirm: () => false })
    projectStore.getState().updateMeta({ title: 'Pas enregistré' })
    expect(await openRequestAction({ path: '/x/salle-b.avwan', text: serializeProject(sampleProject()) })).toBe(false)
    expect(projectStore.getState().filePath).toBe('/tmp/a.avwan')
    expect(projectStore.getState().history.present.meta.title).toBe('Pas enregistré')
  })

  it('affiche l’erreur de lecture en français', async () => {
    vi.stubGlobal('window', { avwan: fakeApi(), confirm: () => true })
    expect(await openRequestAction({ path: '/x/absent.avwan', error: 'Fichier ou dossier introuvable (ENOENT).' })).toBe(false)
    expect(projectStore.getState().toast).toBe('Ouverture impossible : Fichier ou dossier introuvable (ENOENT).')
  })
})
