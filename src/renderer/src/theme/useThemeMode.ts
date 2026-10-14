import { useEffect, useState } from 'react'
import type { ThemeMode } from '../canvas/cordStyle'

function currentMode(): ThemeMode {
  const forced = document.documentElement.dataset['theme']
  if (forced === 'light' || forced === 'dark') return forced
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(currentMode)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => setMode(currentMode())
    mq.addEventListener('change', onChange)
    // La bascule de thème modifie data-theme sur <html> : on suit aussi l'attribut.
    const observer = new MutationObserver(onChange)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', onChange)
      observer.disconnect()
    }
  }, [])
  return mode
}
