import { useEffect } from 'react'
import { currentMessages } from '../i18n/useT'
import { dmxChannelsStore } from '../store/dmxChannelsStore'
import { projectStore } from '../store/projectStore'
import { ipcErrorMessage } from './ipcError'

// Au démarrage, puis à chaque retour sur la fenêtre : une autre fenêtre a pu modifier les listes.
export function useDmxChannelsLoad(): void {
  useEffect(() => {
    const load = (report: boolean): void => {
      dmxChannelsStore
        .getState()
        .load()
        .catch((e: unknown) => {
          if (report) projectStore.getState().showToast(currentMessages().app.file.dmxListsUnreadable({ reason: ipcErrorMessage(e) }))
        })
    }
    load(true)
    const onFocus = (): void => load(false)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])
}
