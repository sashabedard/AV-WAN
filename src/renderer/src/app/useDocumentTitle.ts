import { useEffect } from 'react'
import { isDirty, useProjectStore } from '../store/projectStore'
import { fileNameOf } from './fileActions'

export function useDocumentTitle(): void {
  const filePath = useProjectStore((s) => s.filePath)
  const dirty = useProjectStore(isDirty)
  useEffect(() => {
    document.title = `${dirty ? '● ' : ''}${fileNameOf(filePath)} — AV·WAN`
    if (window.avwan.isE2E) return
    window.onbeforeunload = dirty
      ? (e: BeforeUnloadEvent) => {
          e.preventDefault()
          return ''
        }
      : null
  }, [filePath, dirty])
}
