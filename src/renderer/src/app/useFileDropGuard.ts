import { useEffect } from 'react'
import { projectStore } from '../store/projectStore'

export const FILE_DROP_MESSAGE = 'Pour ouvrir un projet, utilisez Fichier › Ouvrir…'

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
      projectStore.getState().showToast(FILE_DROP_MESSAGE)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])
}
