import { useEffect } from 'react'
import type { SettingsView } from '../../../shared/api'
import { uiStore } from '../store/uiStore'

// Le réglage vit dans le processus principal (case du menu) : on le lit au démarrage, puis on suit ses changements.
export function useSettingsSync(): void {
  useEffect(() => {
    let alive = true
    const apply = (s: SettingsView): void => {
      uiStore.getState().setAutoSave(s.autoSave)
      uiStore.getState().setLang(s.lang)
    }
    window.avwan.settings.get().then(
      (s) => {
        if (alive) apply(s)
      },
      () => undefined
    )
    const off = window.avwan.settings.onChange(apply)
    return () => {
      alive = false
      off()
    }
  }, [])
}
