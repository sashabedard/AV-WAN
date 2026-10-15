// Champs numériques : saisie tolérante (virgule ou point) et affichage à la française.

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
export function parseDecimalField(text: string, positive = false): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const t = withoutThousands(trimmed)?.replace(',', '.')
  if (t === undefined || !DECIMAL.test(t)) return undefined
  const n = Number(t)
  return positive ? (n > 0 ? n : undefined) : n
}

const formatters = new Map<number, Intl.NumberFormat>()

// 1200 → « 1 200 », 14.4 → « 14,4 » ; decimals fixe le nombre de décimales (3 → « 3,0 »).
// Espace ordinaire pour les milliers : les espaces insécables de fr-CA compliquent les tests et les CSV.
export function formatFr(n: number, decimals?: number): string {
  const key = decimals ?? -1
  let f = formatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat('fr-CA', decimals === undefined ? { maximumFractionDigits: 1 } : { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    formatters.set(key, f)
  }
  return f.format(n).replace(/[\u00A0\u202F]/g, ' ')
}
