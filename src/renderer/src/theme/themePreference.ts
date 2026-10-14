export type ThemePreference = 'system' | 'light' | 'dark'
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>

export const THEME_STORAGE_KEY = 'avwan.theme'
export const THEME_LABELS: Record<ThemePreference, string> = { system: 'Système', light: 'Clair', dark: 'Sombre' }
const ORDER: readonly ThemePreference[] = ['system', 'light', 'dark']

export function nextPreference(p: ThemePreference): ThemePreference {
  return ORDER[(ORDER.indexOf(p) + 1) % ORDER.length] as ThemePreference
}

export function readPreference(root: HTMLElement): ThemePreference {
  const v = root.dataset['theme']
  return v === 'light' || v === 'dark' ? v : 'system'
}

export function applyPreference(p: ThemePreference, root: HTMLElement): void {
  if (p === 'system') delete root.dataset['theme']
  else root.dataset['theme'] = p
}

export function loadPreference(storage: PreferenceStorage | null): ThemePreference {
  try {
    const v = storage?.getItem(THEME_STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function savePreference(p: ThemePreference, storage: PreferenceStorage | null): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, p)
  } catch {
    // Stockage indisponible : la préférence ne vaut que pour la session.
  }
}

export function safeLocalStorage(): PreferenceStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
