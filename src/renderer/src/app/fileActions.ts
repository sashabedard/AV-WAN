import { isDirty, projectStore } from '../store/projectStore'
import { parseProjectFile, serializeProject } from '../model/file'

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
  if (res.migratedFrom !== undefined) await window.avwan.file.backup(path)
  s.loadProject(res.project, res.readOnly ? null : path, { readOnly: res.readOnly })
  if (res.readOnly) s.showToast('Ce fichier vient d’une version plus récente d’AV·WAN : ouvert en lecture seule.')
  else if (res.warnings.length > 0) s.showToast(res.warnings.join(' '))
  return true
}

export async function openProjectAction(): Promise<void> {
  if (!confirmDiscard()) return
  try {
    const file = await window.avwan.file.open()
    if (file) await loadFromText(file.path, file.text)
  } catch (e) {
    projectStore.getState().showToast(`Ouverture impossible : ${(e as Error).message}`)
  }
}

export async function saveProjectAsAction(): Promise<void> {
  const s = projectStore.getState()
  const snapshot = s.history.present
  try {
    const path = await window.avwan.file.saveAs(serializeProject(snapshot), suggestedName())
    if (!path) return
    projectStore.setState({ readOnly: false })
    projectStore.getState().markSaved(path, snapshot)
  } catch (e) {
    s.showToast(`Échec de l’enregistrement : ${(e as Error).message}`)
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
  } catch (e) {
    s.showToast(`Échec de l’enregistrement : ${(e as Error).message}`)
  }
}
