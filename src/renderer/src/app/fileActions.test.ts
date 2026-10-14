import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AvwanApi } from '../../../shared/api'
import { isDirty, projectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'
import { serializeProject } from '../model/file'
import { loadFromText, newProjectAction, openProjectAction, openRecentAction, openRequestAction, restoreRecoveryAction, revertToOpenedAction, saveProjectAction, saveProjectAsAction } from './fileActions'
import { autosave } from './autosave'
import { blankDraft, templateFromDraft } from '../model/customTemplate'
import { uiStore } from '../store/uiStore'

function fakeApi(file: Partial<AvwanApi['file']> = {}): AvwanApi {
  return {
    platform: 'darwin',
    isE2E: false,
    autosaveMs: 30_000,
    recovery: {
      write: vi.fn(async () => 'u-test00'),
      discard: vi.fn(async () => undefined),
      list: vi.fn(async () => []),
      restore: vi.fn(async (key: string) => ({ key, path: null, text: '' })),
      findNewer: vi.fn(async () => null)
    },
    library: { list: vi.fn(async () => []), save: vi.fn(async () => undefined), remove: vi.fn(async () => undefined) },
    onMenu: () => () => undefined,
    onOpenRequest: () => () => undefined,
    rendererReady: vi.fn(),
    updates: { pending: vi.fn(async () => null), install: vi.fn() },
    onUpdateReady: () => () => undefined,
    settings: { get: vi.fn(async () => ({ autoSave: true })), onChange: () => () => undefined },
    window: { setTitleBarColors: vi.fn(), showMenu: vi.fn(), onFullscreen: () => () => undefined },
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
      createDefault: vi.fn(async () => '/docs/Nouveau projet.avwan'),
      saveSync: vi.fn(() => ({ ok: true as const })),
      discardAutoCreated: vi.fn(async () => undefined),
      openedVersion: vi.fn(async () => null),
      ...file
    }
  }
}

beforeEach(() => {
  // Enregistrement automatique coupé par défaut : seuls les tests qui le décrivent l'allument (minuteurs simulés).
  uiStore.getState().setAutoSave(false)
  projectStore.getState().loadProject(sampleProject(), '/tmp/a.avwan')
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  uiStore.getState().setAutoSave(true)
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

  it('un fichier invalide laisse l’accueil ouvert et affiche l’erreur', async () => {
    vi.stubGlobal('window', { avwan: fakeApi(), confirm: () => true })
    uiStore.getState().setWelcome(true)
    expect(await openRequestAction({ path: '/x/casse.avwan', text: '{' })).toBe(false)
    expect(uiStore.getState().welcome).toBe(true)
    expect(projectStore.getState().toast).toContain('JSON')
  })

  it('une exception pendant l’ouverture devient un toast, accueil ouvert', async () => {
    const backup = vi.fn(async () => { throw new Error('disque plein') })
    vi.stubGlobal('window', { avwan: fakeApi({ backup }), confirm: () => true })
    uiStore.getState().setWelcome(true)
    const p = sampleProject()
    p.links.push({ id: 'l2', cableId: 'C-002', a: { deviceId: 'fantome', portId: 'ETH' }, b: { deviceId: 'sw1', portId: '2' }, medium: 'cat6' })
    expect(await openRequestAction({ path: '/x/orphelin.avwan', text: serializeProject(p) })).toBe(false)
    expect(uiStore.getState().welcome).toBe(true)
    expect(projectStore.getState().toast).toContain('Ouverture impossible')
  })
})

describe('copie de récupération et fichier', () => {
  it('⌘S efface la copie du document', async () => {
    const api = fakeApi()
    vi.mocked(api.recovery.write).mockResolvedValue('f-0123456789abcdef')
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    projectStore.getState().updateMeta({ title: 'Modifié' })
    await autosave.tick()
    await saveProjectAction()
    expect(api.recovery.discard).toHaveBeenCalledWith('f-0123456789abcdef')
  })

  it('abandonner les modifications pour ouvrir un autre fichier efface la copie', async () => {
    const api = fakeApi()
    vi.mocked(api.recovery.write).mockResolvedValue('f-fedcba9876543210')
    vi.mocked(api.recent.open).mockResolvedValue({ path: '/x/b.avwan', text: serializeProject(sampleProject()) })
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    projectStore.getState().updateMeta({ title: 'Modifié' })
    await autosave.tick()
    await openRecentAction('/x/b.avwan')
    expect(api.recovery.discard).toHaveBeenCalledWith('f-fedcba9876543210')
  })

  it('une ouverture annulée garde la copie du document resté ouvert', async () => {
    const api = fakeApi({ open: vi.fn(async () => null) })
    vi.mocked(api.recovery.write).mockResolvedValue('f-0123456789abcdef')
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    projectStore.getState().updateMeta({ title: 'Modifié' })
    await autosave.tick()
    await openProjectAction()
    expect(api.recovery.discard).not.toHaveBeenCalled()
    expect(projectStore.getState().filePath).toBe('/tmp/a.avwan')
  })
})

describe('restauration', () => {
  it('Restaurer recharge la copie comme modifiée, reliée à son fichier', async () => {
    const api = fakeApi()
    vi.mocked(api.recovery.restore).mockResolvedValue({ key: 'f-0123456789abcdef', path: '/x/salle-b.avwan', text: serializeProject(sampleProject()) })
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    uiStore.getState().setWelcome(true)
    expect(await restoreRecoveryAction('f-0123456789abcdef')).toBe(true)
    expect(projectStore.getState().filePath).toBe('/x/salle-b.avwan')
    expect(isDirty(projectStore.getState())).toBe(true)
    expect(uiStore.getState().welcome).toBe(false)
  })

  it('une copie illisible affiche l’erreur et ne touche pas au projet', async () => {
    const api = fakeApi()
    vi.mocked(api.recovery.restore).mockResolvedValue({ key: 'u-abcdef', path: null, text: '{pas du json' })
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    expect(await restoreRecoveryAction('u-abcdef')).toBe(false)
    expect(projectStore.getState().filePath).toBe('/tmp/a.avwan')
    expect(projectStore.getState().toast).toMatch(/^Restauration impossible : Fichier illisible/)
  })

  it('une copie d’une version plus récente se restaure en lecture seule', async () => {
    const api = fakeApi()
    const future = JSON.stringify({ ...sampleProject(), schemaVersion: 2 })
    vi.mocked(api.recovery.restore).mockResolvedValue({ key: 'f-0123456789abcdef', path: '/x/salle-b.avwan', text: future })
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    expect(await restoreRecoveryAction('f-0123456789abcdef')).toBe(true)
    expect(projectStore.getState().readOnly).toBe(true)
    expect(projectStore.getState().filePath).toBeNull()
    expect(projectStore.getState().toast).toBe('Version récupérée restaurée en lecture seule : elle vient d’une version plus récente d’AV·WAN. Utilisez « Enregistrer sous… ».')
  })

  it('une copie dont le fichier a disparu se restaure sans titre ; ⌘S passe par « Enregistrer sous »', async () => {
    const api = fakeApi()
    vi.mocked(api.recovery.restore).mockResolvedValue({ key: 'f-0123456789abcdef', path: null, text: serializeProject(sampleProject()) })
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    expect(await restoreRecoveryAction('f-0123456789abcdef')).toBe(true)
    expect(projectStore.getState().filePath).toBeNull()
    expect(isDirty(projectStore.getState())).toBe(true)
    expect(projectStore.getState().toast).toBe('Version récupérée restaurée. Enregistrez-la pour la garder.')
    await saveProjectAction()
    expect(api.file.saveAs).toHaveBeenCalled()
    expect(api.file.save).not.toHaveBeenCalled()
  })

  it('ouvrir un fichier qui a une copie plus récente propose de la restaurer', async () => {
    const api = fakeApi()
    const entry = { key: 'f-0123456789abcdef', path: '/x/b.avwan', title: 'B', savedAt: new Date().toISOString() }
    vi.mocked(api.recent.open).mockResolvedValue({ path: '/x/b.avwan', text: serializeProject(sampleProject()) })
    vi.mocked(api.recovery.findNewer).mockResolvedValue(entry)
    vi.mocked(api.recovery.restore).mockResolvedValue({ key: entry.key, path: '/x/b.avwan', text: serializeProject(sampleProject()) })
    const confirm = vi.fn(() => true)
    vi.stubGlobal('window', { avwan: api, confirm })
    await openRecentAction('/x/b.avwan')
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Une version récupérée de b.avwan'))
    expect(api.recovery.restore).toHaveBeenCalledWith(entry.key)
    expect(isDirty(projectStore.getState())).toBe(true)
  })

  it('rouvrir le fichier déjà ouvert ne propose pas sa propre copie', async () => {
    const api = fakeApi()
    vi.mocked(api.recent.open).mockResolvedValue({ path: '/tmp/a.avwan', text: serializeProject(sampleProject()) })
    vi.mocked(api.recovery.findNewer).mockResolvedValue({ key: 'f-0123456789abcdef', path: '/tmp/a.avwan', title: 'A', savedAt: new Date().toISOString() })
    const confirm = vi.fn(() => true)
    vi.stubGlobal('window', { avwan: api, confirm })
    await openRecentAction('/tmp/a.avwan')
    expect(api.recovery.findNewer).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('refuser la copie ouvre le fichier tel quel et efface la copie', async () => {
    const api = fakeApi()
    const entry = { key: 'f-0123456789abcdef', path: '/x/b.avwan', title: 'B', savedAt: new Date().toISOString() }
    vi.mocked(api.recent.open).mockResolvedValue({ path: '/x/b.avwan', text: serializeProject(sampleProject()) })
    vi.mocked(api.recovery.findNewer).mockResolvedValue(entry)
    vi.stubGlobal('window', { avwan: api, confirm: () => false })
    await openRecentAction('/x/b.avwan')
    expect(api.recovery.restore).not.toHaveBeenCalled()
    expect(api.recovery.discard).toHaveBeenCalledWith(entry.key)
    expect(projectStore.getState().filePath).toBe('/x/b.avwan')
    expect(isDirty(projectStore.getState())).toBe(false)
  })

  it('refuser la copie puis échouer à ouvrir le fichier garde la copie', async () => {
    const api = fakeApi()
    const entry = { key: 'f-0123456789abcdef', path: '/x/b.avwan', title: 'B', savedAt: new Date().toISOString() }
    vi.mocked(api.recent.open).mockResolvedValue({ path: '/x/b.avwan', text: '{' })
    vi.mocked(api.recovery.findNewer).mockResolvedValue(entry)
    vi.stubGlobal('window', { avwan: api, confirm: () => false })
    await openRecentAction('/x/b.avwan')
    expect(api.recovery.discard).not.toHaveBeenCalled()
    expect(projectStore.getState().toast).toContain('JSON')
  })
})

describe('enregistrer un projet avec des composantes', () => {
  it('n’écrit que les composantes utilisées, sans toucher au projet ouvert', async () => {
    const api = fakeApi()
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    const unused = templateFromDraft({ ...blankDraft(), name: 'Inutile', code: 'INU' }, 'custom-inutile001')
    projectStore.getState().apply((p) => ({ ...p, templates: [unused] }))
    await saveProjectAction()
    const written = JSON.parse(vi.mocked(api.file.save).mock.calls[0]![1]) as { templates: unknown[] }
    expect(written.templates).toEqual([])
    expect(projectStore.getState().history.present.templates).toEqual([unused])
  })
})

describe('« Enregistrer sous » depuis un fichier créé automatiquement', () => {
  it('le fichier quitté est confié au processus principal, qui ne supprime que ses propres créations', async () => {
    const api = fakeApi()
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    await saveProjectAsAction()
    expect(projectStore.getState().filePath).toBe('/tmp/copie.avwan')
    // Les deux chemins : le processus principal vérifie sur le disque que ce n'est pas le même fichier.
    expect(api.file.discardAutoCreated).toHaveBeenCalledWith('/tmp/a.avwan', '/tmp/copie.avwan')
  })

  it('rien à déplacer pour un projet sans fichier, ni quand le chemin ne change pas', async () => {
    const api = fakeApi()
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    projectStore.getState().loadProject(sampleProject(), null)
    await saveProjectAsAction()
    expect(projectStore.getState().filePath).toBe('/tmp/copie.avwan')
    await saveProjectAsAction()
    expect(api.file.discardAutoCreated).not.toHaveBeenCalled()
  })

  it('« Enregistrer sous » annulé ou en échec : rien n’est supprimé', async () => {
    const api = fakeApi({ saveAs: vi.fn(async () => null) })
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    await saveProjectAsAction()
    vi.mocked(api.file.saveAs).mockRejectedValueOnce(new Error('EACCES'))
    await saveProjectAsAction()
    expect(api.file.discardAutoCreated).not.toHaveBeenCalled()
    expect(projectStore.getState().filePath).toBe('/tmp/a.avwan')
  })
})

describe('revenir à la version d’ouverture', () => {
  const NONE = 'Aucune version d’ouverture pour ce fichier.'

  it('projet sans fichier : message clair, rien ne change', async () => {
    const api = fakeApi()
    const confirm = vi.fn(() => true)
    vi.stubGlobal('window', { avwan: api, confirm })
    projectStore.getState().loadProject(sampleProject(), null)
    const before = projectStore.getState().history.present
    expect(await revertToOpenedAction()).toBe(false)
    expect(projectStore.getState().toast).toBe(NONE)
    expect(api.file.openedVersion).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
    expect(projectStore.getState().history.present).toBe(before)
  })

  it('fichier sans version d’ouverture (créé automatiquement) : même message, projet inchangé', async () => {
    const api = fakeApi({ openedVersion: vi.fn(async () => null) })
    const confirm = vi.fn(() => true)
    vi.stubGlobal('window', { avwan: api, confirm })
    projectStore.getState().updateMeta({ title: 'Modifié' })
    const before = projectStore.getState().history.present
    expect(await revertToOpenedAction()).toBe(false)
    expect(api.file.openedVersion).toHaveBeenCalledWith('/tmp/a.avwan')
    expect(projectStore.getState().toast).toBe(NONE)
    expect(confirm).not.toHaveBeenCalled()
    expect(projectStore.getState().history.present).toBe(before)
  })

  it('confirmé : le projet redevient la version d’ouverture, et ⌘Z redonne le projet d’avant', async () => {
    const opened = { ...sampleProject(), meta: { ...sampleProject().meta, title: 'Version d’ouverture' } }
    const api = fakeApi({ openedVersion: vi.fn(async () => serializeProject(opened)) })
    const confirm = vi.fn(() => true)
    vi.stubGlobal('window', { avwan: api, confirm })
    projectStore.getState().updateMeta({ title: 'Modifié depuis' })
    const before = projectStore.getState().history.present
    expect(await revertToOpenedAction()).toBe(true)
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Revenir à la version d’ouverture de a.avwan ?'))
    expect(projectStore.getState().history.present.meta.title).toBe('Version d’ouverture')
    expect(projectStore.getState().filePath).toBe('/tmp/a.avwan')
    // Une modification ordinaire : l'enregistrement automatique l'écrira dans le fichier.
    expect(isDirty(projectStore.getState())).toBe(true)
    projectStore.getState().undo()
    expect(projectStore.getState().history.present).toBe(before)
  })

  it('confirmation refusée : rien ne change', async () => {
    const api = fakeApi({ openedVersion: vi.fn(async () => serializeProject(sampleProject())) })
    vi.stubGlobal('window', { avwan: api, confirm: () => false })
    projectStore.getState().updateMeta({ title: 'Modifié depuis' })
    const before = projectStore.getState().history
    expect(await revertToOpenedAction()).toBe(false)
    expect(projectStore.getState().history).toBe(before)
  })

  it('version illisible ou erreur du processus principal : message, projet inchangé', async () => {
    const api = fakeApi({ openedVersion: vi.fn(async () => '{') })
    vi.stubGlobal('window', { avwan: api, confirm: () => true })
    const before = projectStore.getState().history
    expect(await revertToOpenedAction()).toBe(false)
    expect(projectStore.getState().toast).toMatch(/^Retour impossible : /)
    vi.mocked(api.file.openedVersion).mockRejectedValueOnce(new Error("Error invoking remote method 'file:openedVersion': Error: Accès refusé (EACCES)."))
    expect(await revertToOpenedAction()).toBe(false)
    expect(projectStore.getState().toast).toBe('Retour impossible : Accès refusé (EACCES).')
    expect(projectStore.getState().history).toBe(before)
  })
})

describe('changer de document moins de 2 s après une modification (enregistrement automatique)', () => {
  const QUESTION = 'Des modifications ne sont pas enregistrées. Continuer quand même ?'
  beforeEach(() => {
    vi.useFakeTimers()
    uiStore.getState().setAutoSave(true)
  })

  it('⌘N : la dernière modification est écrite dans le fichier, sans question', () => {
    const api = fakeApi()
    const confirm = vi.fn(() => false)
    vi.stubGlobal('window', { avwan: api, confirm })
    projectStore.getState().updateMeta({ title: 'Dernière modification' })
    newProjectAction()
    expect(api.file.saveSync).toHaveBeenCalledWith('/tmp/a.avwan', expect.stringContaining('"title": "Dernière modification"'))
    expect(confirm).not.toHaveBeenCalled()
    expect(projectStore.getState().filePath).toBeNull()
  })

  it('⌘O : la boîte d’ouverture s’affiche sans question une fois la modification écrite', async () => {
    const api = fakeApi()
    const confirm = vi.fn(() => false)
    vi.stubGlobal('window', { avwan: api, confirm })
    projectStore.getState().updateMeta({ title: 'Dernière modification' })
    await openProjectAction()
    expect(api.file.saveSync).toHaveBeenCalledTimes(1)
    expect(confirm).not.toHaveBeenCalled()
    expect(api.file.open).toHaveBeenCalledTimes(1)
  })

  it('écriture impossible : la question habituelle revient, et refuser garde le projet', () => {
    const api = fakeApi({ saveSync: vi.fn(() => ({ ok: false as const, error: 'Disque plein (ENOSPC).' })) })
    const confirm = vi.fn(() => false)
    vi.stubGlobal('window', { avwan: api, confirm })
    projectStore.getState().updateMeta({ title: 'Pas écrit' })
    newProjectAction()
    expect(api.file.saveSync).toHaveBeenCalledTimes(1)
    expect(confirm).toHaveBeenCalledWith(QUESTION)
    expect(projectStore.getState().filePath).toBe('/tmp/a.avwan')
    expect(projectStore.getState().history.present.meta.title).toBe('Pas écrit')
  })
})
