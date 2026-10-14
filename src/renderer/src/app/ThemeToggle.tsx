import { useState } from 'react'
import { THEME_LABELS, applyPreference, nextPreference, readPreference, safeLocalStorage, savePreference, type ThemePreference } from '../theme/themePreference'

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>(() => readPreference(document.documentElement))
  const next = nextPreference(pref)
  return (
    <button
      type="button"
      className="topbar__btn"
      aria-label={`Thème : ${THEME_LABELS[pref].toLowerCase()}`}
      title={`Passer au thème ${THEME_LABELS[next].toLowerCase()}`}
      onClick={() => {
        applyPreference(next, document.documentElement)
        savePreference(next, safeLocalStorage())
        setPref(next)
      }}
    >
      {THEME_LABELS[pref]}
    </button>
  )
}
