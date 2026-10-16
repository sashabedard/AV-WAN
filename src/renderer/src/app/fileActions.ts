import { isDirty, projectStore } from '../store/projectStore'
import { parseProjectFile } from '../model/file'
import { fileTextOf } from './fileText'
import { ipcErrorMessage } from './ipcError'
import type { OpenedFile, OpenRequest, RecoveryEntry } from '../../../shared/api'
import { uiStore } from '../store/uiStore'
import { autosave } from './autosave'
import { fileAutoSave } from './fileAutoSave'
import { fileNameOf } from './fileName'
import { currentMessages } from '../i18n/useT'
import { timeAgo } from './timeAgo'

// Comme à la fermeture : avec l'enregistrement automatique, la dernière modification est d'abord écrite dans
// le fichier ; la question ne revient que si cette écriture est impossible.
function confirmDiscard(): boolean {
  return !isDirty(projectStore.getState()) || fileAutoSave.flushSync() || window.confirm(currentMessages().app.file.discardQuestion)
}

export function suggestedName(): string {
  const title = projectStore.getState().history.present.meta.title.trim()
  return (title || currentMessages().app.defaultFileName).replace(/[\\/:*?"<>|]+/g, '-')
}

export function newProjectAction(): void {
  if (confirmDiscard()) projectStore.getState().newProject()
}

export async function loadFromText(path: string, text: string): Promise<boolean> {
  const s = projectStore.getState()
  const res = parseProjectFile(text, currentMessages())
  if (!res.ok) {
    s.showToast(res.error)
    return false
  }
  // Copie de l'original avant qu'un enregistrement ne l'écrase (migration ou câbles retirés).
  let backupPath: string | null = null
  if (res.migratedFrom !== undefined || res.warnings.length > 0) backupPath = await window.avwan.file.backup(path)
  s.loadProject(res.project, res.readOnly ? null : path, { readOnly: res.readOnly })
  if (res.readOnly) s.showToast(currentMessages().app.file.openedReadOnly)
  else if (res.warnings.length > 0) {
    const kept = backupPath ? currentMessages().app.file.backupKept({ name: fileNameOf(backupPath) }) : ''
    s.showToast(`${res.warnings.join(' ')}${kept}`)
  }
  // Le fichier est valide : il peut entrer dans les récents (un échec ici n'empêche pas l'ouverture).
  void window.avwan.recent.remember(path).catch(() => undefined)
  return true
}

// Copie de récupération rechargée « modifiée » : ⌘S l'écrit à l'emplacement d'origine (chemin accordé par le
// processus principal), ou passe par « Enregistrer sous » si le fichier a disparu.
export async function restoreRecoveryAction(key: string): Promise<boolean> {
  const s = projectStore.getState()
  try {
    const restored = await window.avwan.recovery.restore(key)
    const res = parseProjectFile(restored.text, currentMessages())
    if (!res.ok) {
      s.showToast(currentMessages().app.file.restoreFailed({ reason: res.error }))
      return false
    }
    s.loadProject(res.project, res.readOnly ? null : restored.path, { readOnly: res.readOnly, restored: true })
    autosave.adopt(restored.key)
    uiStore.getState().setWelcome(false)
    const target = restored.path && !res.readOnly ? fileNameOf(restored.path) : null
    // Enregistrement automatique actif : la copie part seule dans son fichier, ou dans Documents › AV·WAN.
    const f = currentMessages().app.file
    const message = uiStore.getState().autoSave
      ? f.restoredAuto({ target: target ?? 'Documents › AV·WAN' })
      : target
        ? f.restoredSaveTo({ target })
        : f.restoredSave
    projectStore
      .getState()
      .showToast(
        res.readOnly ? f.restoredReadOnly : message
      )
    return true
  } catch (e) {
    s.showToast(currentMessages().app.file.restoreFailed({ reason: ipcErrorMessage(e) }))
    return false
  }
}

// Ouvrir un fichier : s'il a une copie plus récente que lui, on propose de la restaurer.
async function loadWithRecovery(file: OpenedFile): Promise<boolean> {
  let newer: RecoveryEntry | null = null
  // Rouvrir le document déjà ouvert : sa copie est celle de cette session, que l'utilisateur vient
  // d'abandonner (confirmDiscard) ; le changement de document l'efface. On ne la propose pas.
  if (file.path !== projectStore.getState().filePath) {
    try {
      newer = await window.avwan.recovery.findNewer(file.path)
    } catch {
      newer = null
    }
  }
  if (newer) {
    const question = currentMessages().app.file.newerRecovery({ name: fileNameOf(file.path), ago: timeAgo(newer.savedAt) })
    if (window.confirm(question)) return restoreRecoveryAction(newer.key)
    // La copie n'est effacée qu'une fois le fichier ouvert : s'il est illisible, il reste la copie.
    const opened = await loadFromText(file.path, file.text)
    if (opened) void window.avwan.recovery.discard(newer.key).catch(() => undefined)
    return opened
  }
  return loadFromText(file.path, file.text)
}

export async function openProjectAction(): Promise<void> {
  if (!confirmDiscard()) return
  try {
    const file = await window.avwan.file.open()
    if (file) await loadWithRecovery(file)
  } catch (e) {
    projectStore.getState().showToast(currentMessages().app.file.openFailed({ reason: ipcErrorMessage(e) }))
  }
}

export async function openRecentAction(path: string): Promise<void> {
  if (!confirmDiscard()) return
  try {
    const file = await window.avwan.recent.open(path)
    await loadWithRecovery(file)
  } catch (e) {
    projectStore.getState().showToast(currentMessages().app.file.openFailed({ reason: ipcErrorMessage(e) }))
  }
}

// Fichier ouvert par le système (double-clic, Dock, 2e instance) : même chemin que ⌘O.
export async function openRequestAction(request: OpenRequest): Promise<boolean> {
  if ('error' in request) {
    projectStore.getState().showToast(currentMessages().app.file.openFailed({ reason: request.error }))
    return false
  }
  if (!confirmDiscard()) return false
  try {
    const opened = await loadWithRecovery(request)
    if (opened) uiStore.getState().setWelcome(false)
    return opened
  } catch (e) {
    projectStore.getState().showToast(currentMessages().app.file.openFailed({ reason: ipcErrorMessage(e) }))
    return false
  }
}

// L'enregistrement automatique attend la fermeture de la boîte : sinon le délai de 2 s, ou la perte de focus
// causée par la boîte, créerait un fichier en trop dans Documents › AV·WAN pour un projet sans titre.
export function saveProjectAsAction(): Promise<void> {
  return fileAutoSave.suspend(async () => {
    const s = projectStore.getState()
    const snapshot = s.history.present
    try {
      const path = await window.avwan.file.saveAs(fileTextOf(snapshot), suggestedName())
      if (!path) return
      const after = projectStore.getState()
      // Autre document ouvert pendant la boîte : le fichier est écrit, ce document-là n'est pas concerné.
      if (after.docId !== s.docId) return
      // Relu après la boîte : une écriture automatique en cours a pu donner un fichier au projet entre-temps.
      const previous = after.filePath
      projectStore.setState({ readOnly: false })
      projectStore.getState().markSaved(path, snapshot)
      autosave.saved()
      // Un fichier créé automatiquement (Documents › AV·WAN) est déplacé, pas copié : le processus principal
      // ne supprime l'ancien que s'il l'a lui-même créé pendant cette session, et jamais s'il s'agit sur le
      // disque du fichier qu'on vient d'écrire (même nom à la casse près sous macOS et Windows).
      if (previous && previous !== path) void window.avwan.file.discardAutoCreated(previous, path).catch(() => undefined)
    } catch (e) {
      s.showToast(currentMessages().app.file.saveFailed({ reason: ipcErrorMessage(e) }))
    }
  })
}

export async function saveProjectAction(): Promise<void> {
  const s = projectStore.getState()
  if (s.readOnly || !s.filePath) return saveProjectAsAction()
  const path = s.filePath
  const snapshot = s.history.present
  try {
    await window.avwan.file.save(path, fileTextOf(snapshot))
    projectStore.getState().markSaved(path, snapshot)
    autosave.saved()
  } catch (e) {
    s.showToast(currentMessages().app.file.saveFailed({ reason: ipcErrorMessage(e) }))
  }
}

// Filet de sécurité de l'enregistrement automatique : le projet redevient le fichier tel qu'il était à son
// ouverture, par une modification ordinaire (annulable par ⌘Z), écrite ensuite dans le fichier.
export async function revertToOpenedAction(): Promise<boolean> {
  const s = projectStore.getState()
  const path = s.filePath
  const none = currentMessages().app.file.noOpenedVersion
  if (!path) {
    s.showToast(none)
    return false
  }
  try {
    const text = await window.avwan.file.openedVersion(path)
    // Autre document ou autre fichier pendant la lecture : cette version n'est plus la sienne.
    const after = projectStore.getState()
    if (after.docId !== s.docId || after.filePath !== path) return false
    if (text === null) {
      s.showToast(none)
      return false
    }
    const res = parseProjectFile(text, currentMessages())
    if (!res.ok) {
      s.showToast(currentMessages().app.file.revertFailed({ reason: res.error }))
      return false
    }
    if (!window.confirm(currentMessages().app.file.revertConfirm({ name: fileNameOf(path) }))) return false
    projectStore.getState().apply(() => res.project)
    return true
  } catch (e) {
    s.showToast(currentMessages().app.file.revertFailed({ reason: ipcErrorMessage(e) }))
    return false
  }
}
