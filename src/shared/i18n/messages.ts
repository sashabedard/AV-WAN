import { fr } from './fr'
import { en } from './en'
import type { Lang } from './lang'

// Forme de `fr` sans les littéraux : une chaîne reste une chaîne, une fonction garde ses paramètres.
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : { readonly [K in keyof T]: Widen<T[K]> }

export type Messages = Widen<typeof fr>

const ALL: Record<Lang, Messages> = { fr, en }

export function messages(lang: Lang): Messages {
  return ALL[lang]
}
