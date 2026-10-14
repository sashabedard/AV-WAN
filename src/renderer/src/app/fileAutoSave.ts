import { useEffect } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { Project } from '../model/types'
import { serializeProject } from '../model/file'
import { pruneTemplates } from '../model/customTemplate'
import { isDirty, projectStore, type ProjectState } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { autosave } from './autosave'
import { fileNameOf } from './fileActions'
import { ipcErrorMessage } from './ipcError'

export const FILE_AUTOSAVE_DELAY_MS = 2000

export interface FileAutoSaveDeps {
  enabled(): boolean
  save(path: string, text: string): Promise<string>
  saveSync(path: string, text: string): { ok: boolean; error?: string }
  createDefault(title: string, text: string): Promise<string>
  onSaved(): void
  toast(message: string): void
}

export interface FileAutoSave {
  flush(): Promise<void>
  flushSync(): boolean
  stop(): void
}

const fileText = (project: Project): string => serializeProject(pruneTemplates(project))

// Enregistrement automatique (spec § 3) : le fichier est écrit 2 s après la dernière modification, tout de
// suite à la perte de focus, et de façon synchrone à la fermeture. Un projet sans titre reçoit son fichier
// dans Documents › AV·WAN. Une seule écriture à la fois ; une demande arrivée pendant ce temps est rejouée.
export function createFileAutoSave(store: StoreApi<ProjectState>, deps: FileAutoSaveDeps): FileAutoSave {
  let timer: ReturnType<typeof setTimeout> | null = null
  let seen = store.getState().history.present
  let docId = store.getState().docId
  let running: Promise<void> | null = null
  // Version en cours d'écriture, et demande arrivée pendant ce temps (elle vaut pour le document courant).
  let writing: Project | null = null
  let again = false
  // Un seul message par série d'échecs : remis à zéro par une réussite ou un autre document.
  let failing = false

  const cancel = (): void => {
    if (timer !== null) clearTimeout(timer)
    timer = null
  }
  const writable = (s: ProjectState): boolean => deps.enabled() && !s.readOnly && isDirty(s)

  // Seul un nouveau contenu relance le délai (pas un message ni une sélection). Ouvrir ou créer un
  // document n'écrit rien par soi-même.
  const unsubscribe = store.subscribe((s) => {
    if (s.docId !== docId) {
      docId = s.docId
      seen = s.history.present
      failing = false
      again = false
      cancel()
      return
    }
    if (s.history.present === seen) return
    seen = s.history.present
    cancel()
    if (writable(s)) timer = setTimeout(() => void flush(), FILE_AUTOSAVE_DELAY_MS)
  })

  // Ne rejette jamais : un échec devient un message.
  const write = async (s: ProjectState): Promise<void> => {
    const snapshot = s.history.present
    writing = snapshot
    try {
      const text = fileText(snapshot)
      let path = s.filePath
      if (path) await deps.save(path, text)
      else {
        path = await deps.createDefault(snapshot.meta.title, text)
        deps.toast(`Enregistré dans Documents › AV·WAN › ${fileNameOf(path)}`)
      }
      failing = false
      const after = store.getState()
      // Autre document, ou « Enregistrer sous » pendant l'écriture : rien à marquer ici. Si le projet a
      // bougé pendant l'écriture, il reste modifié (seule la version écrite est marquée enregistrée).
      if (after.docId !== s.docId || after.filePath !== s.filePath) return
      after.markSaved(path, snapshot)
      deps.onSaved()
    } catch (e) {
      if (!failing) deps.toast(`Enregistrement automatique impossible : ${ipcErrorMessage(e)}`)
      failing = true
    } finally {
      writing = null
    }
  }

  const flush = (): Promise<void> => {
    cancel()
    if (running) {
      again = true
      return running
    }
    const s = store.getState()
    if (!writable(s)) return Promise.resolve()
    // La promesse rendue couvre aussi l'écriture rejouée ; flush() revérifie case, lecture seule et état modifié.
    running = write(s).then(() => {
      running = null
      if (!again) return
      again = false
      return flush()
    })
    return running
  }

  return {
    flush,
    // Fermeture de la fenêtre : true si rien n'est perdu. false fait poser la question habituelle.
    flushSync: () => {
      const s = store.getState()
      if (!isDirty(s)) return true
      if (!deps.enabled() || s.readOnly || !s.filePath) return false
      const present = s.history.present
      // Une écriture plus ancienne encore en cours pourrait finir après celle-ci et l'écraser : on demande.
      if (writing !== null && writing !== present) return false
      try {
        if (!deps.saveSync(s.filePath, fileText(present)).ok) return false
      } catch {
        return false
      }
      cancel()
      failing = false
      store.getState().markSaved(s.filePath, present)
      deps.onSaved()
      return true
    },
    stop: () => {
      unsubscribe()
      cancel()
    }
  }
}

// L'instance de l'app : window.avwan n'est lu qu'au moment d'écrire. Promise.resolve().then() change une
// API absente (tests sans window.avwan) en promesse rejetée, que le contrôleur transforme en message.
export const fileAutoSave = createFileAutoSave(projectStore, {
  enabled: () => uiStore.getState().autoSave,
  save: (path, text) => Promise.resolve().then(() => window.avwan.file.save(path, text)),
  saveSync: (path, text) => window.avwan.file.saveSync(path, text),
  createDefault: (title, text) => Promise.resolve().then(() => window.avwan.file.createDefault(title, text)),
  onSaved: () => autosave.saved(),
  toast: (message) => projectStore.getState().showToast(message)
})

// Écriture immédiate à la perte de focus de la fenêtre.
export function useFileAutoSave(): void {
  useEffect(() => {
    const onBlur = (): void => void fileAutoSave.flush()
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [])
}
