import { isDirty, projectStore } from '../store/projectStore'
import { parseProjectFile, serializeProject } from '../model/file'
import { pruneTemplates } from '../model/customTemplate'
import { ipcErrorMessage } from './ipcError'
import type { OpenedFile, OpenRequest, RecoveryEntry } from '../../../shared/api'
import { uiStore } from '../store/uiStore'
import { autosave } from './autosave'
import { fileAutoSave } from './fileAutoSave'
import { fileNameOf } from './fileName'
import { timeAgo } from './timeAgo'

const DISCARD_QUESTION = 'Des modifications ne sont pas enregistrées. Continuer quand même ?'

// Comme à la fermeture : avec l'enregistrement automatique, la dernière modification est d'abord écrite dans
// le fichier ; la question ne revient que si cette écriture est impossible.
function confirmDiscard(): boolean {
  return !isDirty(projectStore.getState()) || fileAutoSave.flushSync() || window.confirm(DISCARD_QUESTION)
}

export function suggestedName(): string {
  const title = projectStore.getState().history.present.meta.title.trim()
  return (title || 'projet').replace(/[\\/:*?"<>|]+/g, '-')
}

export function newProjectAction(): void {
  if (confirmDiscard()) projectStore.getState().newProject()
}

export async function loadFromText(path: string, text: string): Promise<boolean> {
  const s = projectStore.getState()
  const res = parseProjectFile(text)
  if (!res.ok) {
    s.showToast(res.error)
    return false
  }
  // Copie de l'original avant qu'un enregistrement ne l'écrase (migration ou câbles retirés).
  let backupPath: string | null = null
  if (res.migratedFrom !== undefined || res.warnings.length > 0) backupPath = await window.avwan.file.backup(path)
  s.loadProject(res.project, res.readOnly ? null : path, { readOnly: res.readOnly })
  if (res.readOnly) s.showToast('Ce fichier vient d’une version plus récente d’AV·WAN : ouvert en lecture seule.')
  else if (res.warnings.length > 0) {
    const kept = backupPath ? ` Copie de sauvegarde conservée : ${fileNameOf(backupPath)}` : ''
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
    const res = parseProjectFile(restored.text)
    if (!res.ok) {
      s.showToast(`Restauration impossible : ${res.error}`)
      return false
    }
    s.loadProject(res.project, res.readOnly ? null : restored.path, { readOnly: res.readOnly, restored: true })
    autosave.adopt(restored.key)
    uiStore.getState().setWelcome(false)
    const where = restored.path && !res.readOnly ? ` Enregistrez pour la garder dans ${fileNameOf(restored.path)}.` : ' Enregistrez-la pour la garder.'
    projectStore
      .getState()
      .showToast(
        res.readOnly
          ? 'Version récupérée restaurée en lecture seule : elle vient d’une version plus récente d’AV·WAN. Utilisez « Enregistrer sous… ».'
          : `Version récupérée restaurée.${where}`
      )
    return true
  } catch (e) {
    s.showToast(`Restauration impossible : ${ipcErrorMessage(e)}`)
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
    const question = `Une version récupérée de ${fileNameOf(file.path)}, plus récente que le fichier (${timeAgo(newer.savedAt)}), existe. Restaurer cette version ?`
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
    projectStore.getState().showToast(`Ouverture impossible : ${ipcErrorMessage(e)}`)
  }
}

export async function openRecentAction(path: string): Promise<void> {
  if (!confirmDiscard()) return
  try {
    const file = await window.avwan.recent.open(path)
    await loadWithRecovery(file)
  } catch (e) {
    projectStore.getState().showToast(`Ouverture impossible : ${ipcErrorMessage(e)}`)
  }
}

// Fichier ouvert par le système (double-clic, Dock, 2e instance) : même chemin que ⌘O.
export async function openRequestAction(request: OpenRequest): Promise<boolean> {
  if ('error' in request) {
    projectStore.getState().showToast(`Ouverture impossible : ${request.error}`)
    return false
  }
  if (!confirmDiscard()) return false
  try {
    const opened = await loadWithRecovery(request)
    if (opened) uiStore.getState().setWelcome(false)
    return opened
  } catch (e) {
    projectStore.getState().showToast(`Ouverture impossible : ${ipcErrorMessage(e)}`)
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
      const path = await window.avwan.file.saveAs(serializeProject(pruneTemplates(snapshot)), suggestedName())
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
      s.showToast(`Échec de l’enregistrement : ${ipcErrorMessage(e)}`)
    }
  })
}

export async function saveProjectAction(): Promise<void> {
  const s = projectStore.getState()
  if (s.readOnly || !s.filePath) return saveProjectAsAction()
  const path = s.filePath
  const snapshot = s.history.present
  try {
    await window.avwan.file.save(path, serializeProject(pruneTemplates(snapshot)))
    projectStore.getState().markSaved(path, snapshot)
    autosave.saved()
  } catch (e) {
    s.showToast(`Échec de l’enregistrement : ${ipcErrorMessage(e)}`)
  }
}

// Filet de sécurité de l'enregistrement automatique : le projet redevient le fichier tel qu'il était à son
// ouverture, par une modification ordinaire (annulable par ⌘Z), écrite ensuite dans le fichier.
export async function revertToOpenedAction(): Promise<boolean> {
  const s = projectStore.getState()
  const path = s.filePath
  const none = 'Aucune version d’ouverture pour ce fichier.'
  if (!path) {
    s.showToast(none)
    return false
  }
  try {
    const text = await window.avwan.file.openedVersion(path)
    if (text === null) {
      s.showToast(none)
      return false
    }
    const res = parseProjectFile(text)
    if (!res.ok) {
      s.showToast(`Retour impossible : ${res.error}`)
      return false
    }
    if (!window.confirm(`Revenir à la version d’ouverture de ${fileNameOf(path)} ? Les modifications faites depuis seront remplacées (⌘Z permet d’annuler).`)) return false
    projectStore.getState().apply(() => res.project)
    return true
  } catch (e) {
    s.showToast(`Retour impossible : ${ipcErrorMessage(e)}`)
    return false
  }
}
