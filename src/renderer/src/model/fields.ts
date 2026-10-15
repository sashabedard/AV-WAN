// Champs numériques : saisie tolérante (virgule ou point) et affichage à la française.

const INTEGER = /^\d+$/
const DECIMAL = /^\d+(\.\d+)?$/

// Entier tapé : « » → null (effacer), hors bornes ou pas un entier → undefined (refusé).
export function parseIntField(text: string, min: number, max: number): number | null | undefined {
  const t = text.trim()
  if (t === '') return null
  if (!INTEGER.test(t)) return undefined
  const n = Number(t)
  return n >= min && n <= max ? n : undefined
}

// Nombre décimal (« 14,4 » ou « 14.4 ») ; positive : strictement plus grand que 0, sinon 0 accepté.
export function parseDecimalField(text: string, positive = false): number | null | undefined {
  const t = text.trim().replace(',', '.')
  if (t === '') return null
  if (!DECIMAL.test(t)) return undefined
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
  return f.format(n).replace(/[  ]/g, ' ')
}
