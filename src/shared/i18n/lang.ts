// Langues de l'app (spec plan 6 § 3). Sans Electron : utilisable par le main, le preload et la fenêtre.
export type Lang = 'fr' | 'en'
export const LANGS: readonly Lang[] = ['fr', 'en']

export function isLang(v: unknown): v is Lang {
  return v === 'fr' || v === 'en'
}

// Première langue préférée du système : français si elle commence par « fr », sinon anglais.
export function detectLang(locales: readonly string[]): Lang {
  return (locales[0] ?? '').toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

const ARG = '--avwan-lang='

// Langue passée par le main à la fenêtre (webPreferences.additionalArguments) : pas de clignotement au démarrage.
export function langFromArgv(argv: readonly string[]): Lang {
  const v = argv.find((a) => a.startsWith(ARG))?.slice(ARG.length)
  return isLang(v) ? v : 'fr'
}

export const langArg = (lang: Lang): string => `${ARG}${lang}`
