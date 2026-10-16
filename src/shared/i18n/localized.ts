import type { Lang } from './lang'

// Texte de données en deux langues (catalogue, VLAN prédéfinis, projet exemple) : les deux sont obligatoires.
export type Localized = { readonly fr: string; readonly en: string }

export const loc = (l: Localized, lang: Lang): string => l[lang]
