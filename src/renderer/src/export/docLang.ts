import { isLang, type Lang } from '../../../shared/i18n/lang'
import { safeLocalStorage } from '../theme/themePreference'

export const DOC_LANG_KEY = 'avwan.docLang'

// Langue des documents (PDF, CSV, Excel) : retenue d'un export à l'autre, la langue de l'interface à défaut.
export function loadDocLang(fallback: Lang): Lang {
  try {
    const v = safeLocalStorage()?.getItem(DOC_LANG_KEY)
    return isLang(v) ? v : fallback
  } catch {
    return fallback
  }
}

export function saveDocLang(lang: Lang): void {
  try {
    safeLocalStorage()?.setItem(DOC_LANG_KEY, lang)
  } catch {
    // Stockage indisponible : le choix ne vaut que pour la session.
  }
}
