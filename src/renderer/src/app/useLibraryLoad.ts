import { useEffect } from 'react'
import { libraryStore } from '../store/libraryStore'
import { projectStore } from '../store/projectStore'
import { currentMessages } from '../i18n/useT'
import { ipcErrorMessage } from './ipcError'

export function useLibraryLoad(): void {
  useEffect(() => {
    libraryStore
      .getState()
      .load()
      .catch((e: unknown) => projectStore.getState().showToast(currentMessages().app.file.libraryUnreadable({ reason: ipcErrorMessage(e) })))
  }, [])
}
