// Champs numériques : saisie tolérante (virgule ou point dans les deux langues) ; l'affichage suit la langue.
import { formatters } from '../../../shared/i18n/format'
import type { Lang } from '../../../shared/i18n/lang'

const INTEGER = /^\d+$/
const DECIMAL = /^\d+(\.\d+)?$/
// Milliers à la française : espace ordinaire, insécable (U+00A0) ou fine insécable (U+202F), entre groupes de trois chiffres.
const SPACE = /[ \u00A0\u202F]/
const GROUPED = /^\d{1,3}(?:[ \u00A0\u202F]\d{3})+(?:[.,]\d+)?$/

// « 1 500,5 » → « 1500,5 » ; une espace ailleurs qu'entre des groupes de milliers rend le texte invalide (« 1 5 »).
function withoutThousands(t: string): string | undefined {
  if (!SPACE.test(t)) return t
  return GROUPED.test(t) ? t.replace(/[ \u00A0\u202F]/g, '') : undefined
}

// Entier tapé : « » → null (effacer), hors bornes ou pas un entier → undefined (refusé). « 1 500 » est accepté.
export function parseIntField(text: string, min: number, max: number): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const t = withoutThousands(trimmed)
  if (t === undefined || !INTEGER.test(t)) return undefined
  const n = Number(t)
  return n >= min && n <= max ? n : undefined
}

// Nombre décimal (« 14,4 », « 14.4 » ou « 1 500,5 ») ; positive : strictement plus grand que 0, sinon 0 accepté.
// En anglais, « 1,200 » ou « 12,345.5 » (virgules de milliers, décimales au point) se lit comme l'affichage anglais ; tout le reste : virgule ou point décimal.
const EN_GROUPED = /^\d{1,3}(,\d{3})+(\.\d+)?$/

export function parseDecimalField(text: string, positive: boolean, lang: Lang): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const t = lang === 'en' && EN_GROUPED.test(trimmed) ? trimmed.replace(/,/g, '') : withoutThousands(trimmed)?.replace(',', '.')
  if (t === undefined || !DECIMAL.test(t)) return undefined
  const n = Number(t)
  return positive ? (n > 0 ? n : undefined) : n
}

// 1200 → « 1 200 », 14.4 → « 14,4 » ; decimals fixe le nombre de décimales (3 → « 3,0 »).
// Alias français pour les documents (rapports, PDF) ; un affichage qui suit la langue passe par `fmt.num` (useT) ou `formatters(lang).num`.
export const formatFr: (n: number, decimals?: number) => string = formatters('fr').num

// Valeur d'un champ de saisie : tous les chiffres, sans espace de milliers (qui serait refusée à la relecture), séparateur décimal de la langue.
export function decimalText(n: number, lang: Lang): string {
  return lang === 'fr' ? String(n).replace('.', ',') : String(n)
}
