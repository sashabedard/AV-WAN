// Langue de l'interface côté main (menus, boîtes de dialogue, erreurs). Sans Electron : testable.
import { detectLang, type Lang } from '../shared/i18n/lang'
import { messages, type Messages } from '../shared/i18n/messages'

let current: Lang = 'fr'

export const mainLang = (): Lang => current
export const setMainLang = (lang: Lang): void => {
  current = lang
}
export const mainMessages = (): Messages => messages(current)

// Choix enregistré, sinon la langue du système : sans choix, l'app suit le système d'un lancement à l'autre.
export function effectiveLang(saved: Lang | undefined, system: readonly string[]): Lang {
  return saved ?? detectLang(system)
}
