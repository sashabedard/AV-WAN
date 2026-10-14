import { useEffect } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { AvwanApi } from '../../../shared/api'
import type { Project } from '../model/types'
import { serializeProject } from '../model/file'
import { isDirty, projectStore, type ProjectState } from '../store/projectStore'

export type RecoveryBridge = Pick<AvwanApi['recovery'], 'write' | 'discard'>

export interface Autosave {
  tick(): Promise<void>
  saved(): void
  discardCurrent(): void
  adopt(key: string): void
  stop(): void
}

// Autosauvegarde (spec plan 4 § 5) : une copie par document, seulement s'il est modifié et a changé
// depuis la dernière copie. Effacée à l'enregistrement et quand le document est abandonné.
export function createAutosave(store: StoreApi<ProjectState>, api: RecoveryBridge): Autosave {
  let currentKey: string | null = null
  let lastWritten: Project | null = null
  let running: Promise<void> | null = null
  let docId = store.getState().docId

  const drop = (key: string): void => void api.discard(key).catch(() => undefined)
  const forget = (): void => {
    if (currentKey) drop(currentKey)
    currentKey = null
    lastWritten = null
  }

  const unsubscribe = store.subscribe((s) => {
    if (s.docId === docId) return
    docId = s.docId
    forget()
  })

  const write = async (): Promise<void> => {
    const s = store.getState()
    const present = s.history.present
    if (!isDirty(s) || present === lastWritten) return
    const key = await api.write({ path: s.readOnly ? null : s.filePath, untitledId: s.untitledId, title: present.meta.title, text: serializeProject(present) })
    const after = store.getState()
    // Enregistré ou abandonné pendant l'écriture : cette copie ne sert plus.
    if (after.docId !== s.docId || !isDirty(after)) {
      drop(key)
      return
    }
    if (currentKey && currentKey !== key) drop(currentKey)
    currentKey = key
    lastWritten = present
  }

  return {
    tick: () => {
      running ??= write()
        .catch(() => undefined)
        .finally(() => {
          running = null
        })
      return running
    },
    saved: forget,
    discardCurrent: forget,
    adopt: (key) => {
      currentKey = key
      lastWritten = null
    },
    stop: unsubscribe
  }
}

// L'instance de l'app : window.avwan n'est lu qu'au moment d'écrire. Promise.resolve().then() change
// une API absente (tests sans window.avwan) en promesse rejetée, que createAutosave ignore.
export const autosave = createAutosave(projectStore, {
  write: (doc) => Promise.resolve().then(() => window.avwan.recovery.write(doc)),
  discard: (key) => Promise.resolve().then(() => window.avwan.recovery.discard(key))
})

// Toutes les 30 s et à la perte de focus de la fenêtre.
export function useAutosave(): void {
  useEffect(() => {
    const timer = window.setInterval(() => void autosave.tick(), window.avwan.autosaveMs)
    const onBlur = (): void => void autosave.tick()
    window.addEventListener('blur', onBlur)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
