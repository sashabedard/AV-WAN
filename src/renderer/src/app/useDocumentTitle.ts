import { useEffect } from 'react'
import { isDirty, useProjectStore } from '../store/projectStore'
import { fileNameOf } from './fileActions'
import { fileAutoSave } from './fileAutoSave'

export function useDocumentTitle(): void {
  const filePath = useProjectStore((s) => s.filePath)
  const dirty = useProjectStore(isDirty)
  useEffect(() => {
    document.title = `${dirty ? '● ' : ''}${fileNameOf(filePath)} — AV·WAN`
    if (window.avwan.isE2E) return
    // Enregistrement automatique : les modifications en attente sont écrites avant la fermeture ; la question
    // « modifications non enregistrées » ne revient que si cette écriture est impossible.
    window.onbeforeunload = dirty
      ? (e: BeforeUnloadEvent) => {
          if (fileAutoSave.flushSync()) return undefined
          e.preventDefault()
          return ''
        }
      : null
  }, [filePath, dirty])
}
