import { useEffect } from 'react'
import { libraryStore } from '../store/libraryStore'
import { projectStore } from '../store/projectStore'
import { ipcErrorMessage } from './ipcError'

export function useLibraryLoad(): void {
  useEffect(() => {
    libraryStore
      .getState()
      .load()
      .catch((e: unknown) => projectStore.getState().showToast(`Bibliothèque illisible : ${ipcErrorMessage(e)}`))
  }, [])
}
