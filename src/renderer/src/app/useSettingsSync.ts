import { useEffect } from 'react'
import { uiStore } from '../store/uiStore'

// Le réglage vit dans le processus principal (case du menu) : on le lit au démarrage, puis on suit ses changements.
export function useSettingsSync(): void {
  useEffect(() => {
    let alive = true
    window.avwan.settings.get().then(
      (s) => {
        if (alive) uiStore.getState().setAutoSave(s.autoSave)
      },
      () => undefined
    )
    const off = window.avwan.settings.onChange((s) => uiStore.getState().setAutoSave(s.autoSave))
    return () => {
      alive = false
      off()
    }
  }, [])
}
