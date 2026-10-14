import { isDirty, projectStore } from '../store/projectStore'
import { parseProjectFile, serializeProject } from '../model/file'
import { ipcErrorMessage } from './ipcError'
import type { OpenRequest } from '../../../shared/api'
import { uiStore } from '../store/uiStore'
import { autosave } from './autosave'

const DISCARD_QUESTION = 'Des modifications ne sont pas enregistrées. Continuer quand même ?'

function confirmDiscard(): boolean {
  return !isDirty(projectStore.getState()) || window.confirm(DISCARD_QUESTION)
}

export function fileNameOf(path: string | null): string {
  if (!path) return 'Sans titre'
  const parts = path.split(/[\\/]/)
  return parts[parts.length - 1] || path
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

export async function openProjectAction(): Promise<void> {
  if (!confirmDiscard()) return
  try {
    const file = await window.avwan.file.open()
    if (file) await loadFromText(file.path, file.text)
  } catch (e) {
    projectStore.getState().showToast(`Ouverture impossible : ${ipcErrorMessage(e)}`)
  }
}

export async function openRecentAction(path: string): Promise<void> {
  if (!confirmDiscard()) return
  try {
    const file = await window.avwan.recent.open(path)
    await loadFromText(file.path, file.text)
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
  uiStore.getState().setWelcome(false)
  return loadFromText(request.path, request.text)
}

export async function saveProjectAsAction(): Promise<void> {
  const s = projectStore.getState()
  const snapshot = s.history.present
  try {
    const path = await window.avwan.file.saveAs(serializeProject(snapshot), suggestedName())
    if (!path) return
    projectStore.setState({ readOnly: false })
    projectStore.getState().markSaved(path, snapshot)
    autosave.saved()
  } catch (e) {
    s.showToast(`Échec de l’enregistrement : ${ipcErrorMessage(e)}`)
  }
}

export async function saveProjectAction(): Promise<void> {
  const s = projectStore.getState()
  if (s.readOnly || !s.filePath) return saveProjectAsAction()
  const path = s.filePath
  const snapshot = s.history.present
  try {
    await window.avwan.file.save(path, serializeProject(snapshot))
    projectStore.getState().markSaved(path, snapshot)
    autosave.saved()
  } catch (e) {
    s.showToast(`Échec de l’enregistrement : ${ipcErrorMessage(e)}`)
  }
}
