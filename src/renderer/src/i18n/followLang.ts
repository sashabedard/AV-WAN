import { z } from 'zod'
import { uiStore } from '../store/uiStore'
import type { Lang } from '../../../shared/i18n/lang'

const HTML_LANG: Record<Lang, string> = { fr: 'fr-CA', en: 'en-CA' }

// <html lang> (lecteurs d'écran, césure) et messages de zod suivent la langue de l'interface.
export function followLang(): () => void {
  const apply = (lang: Lang): void => {
    document.documentElement.lang = HTML_LANG[lang]
    z.config(lang === 'fr' ? z.locales.fr() : z.locales.en())
  }
  apply(uiStore.getState().lang)
  return uiStore.subscribe((s, prev) => {
    if (s.lang !== prev.lang) apply(s.lang)
  })
}
