import { createContext, createElement, useContext, useMemo, type ReactNode } from 'react'
import { messages, type Messages } from '../../../shared/i18n/messages'
import { formatters, type Formatters } from '../../../shared/i18n/format'
import type { Lang } from '../../../shared/i18n/lang'
import { uiStore, useUiStore } from '../store/uiStore'

// Langue imposée à un sous-arbre : la fenêtre PDF rend dans la langue des documents (spec plan 6 § 4.4).
const LangOverride = createContext<Lang | null>(null)

export function LangOverrideProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return createElement(LangOverride.Provider, { value: lang }, children)
}

export function useLang(): Lang {
  const forced = useContext(LangOverride)
  const ui = useUiStore((s) => s.lang)
  return forced ?? ui
}

export function useT(): { m: Messages; fmt: Formatters; lang: Lang } {
  const lang = useLang()
  return useMemo(() => ({ m: messages(lang), fmt: formatters(lang), lang }), [lang])
}

// Hors React (actions, stores, toasts) : la langue de l'interface.
export const currentLang = (): Lang => uiStore.getState().lang
export const currentMessages = (): Messages => messages(currentLang())
export const currentFormatters = (): Formatters => formatters(currentLang())
