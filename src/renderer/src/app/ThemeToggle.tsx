import { useState } from 'react'
import { useT } from '../i18n/useT'
import { applyPreference, nextPreference, readPreference, safeLocalStorage, savePreference, type ThemePreference } from '../theme/themePreference'

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>(() => readPreference(document.documentElement))
  const { m } = useT()
  const next = nextPreference(pref)
  return (
    <button
      type="button"
      className="topbar__btn"
      aria-label={m.theme.current({ label: m.theme.labels[pref].toLowerCase() })}
      title={m.theme.switchTo({ label: m.theme.labels[next].toLowerCase() })}
      onClick={() => {
        applyPreference(next, document.documentElement)
        savePreference(next, safeLocalStorage())
        setPref(next)
      }}
    >
      {m.theme.labels[pref]}
    </button>
  )
}
