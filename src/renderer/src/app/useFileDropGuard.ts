import { useEffect } from 'react'
import { currentMessages } from '../i18n/useT'
import { projectStore } from '../store/projectStore'

// Un fichier glissé depuis le système (le glisser de la palette porte son propre type MIME).
export function isFileDrag(types: readonly string[] | undefined): boolean {
  return types?.includes('Files') ?? false
}

// Lâcher un fichier sur la fenêtre ferait naviguer vers file:// et remplacerait l'app.
export function useFileDropGuard(): void {
  useEffect(() => {
    const onDragOver = (e: DragEvent): void => {
      if (isFileDrag(e.dataTransfer?.types)) e.preventDefault()
    }
    const onDrop = (e: DragEvent): void => {
      if (!isFileDrag(e.dataTransfer?.types)) return
      e.preventDefault()
      projectStore.getState().showToast(currentMessages().app.file.dropHint)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])
}
