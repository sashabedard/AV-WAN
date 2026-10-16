import type { Lang } from './lang'

export interface Formatters {
  readonly lang: Lang
  // 1200 → « 1 200 » / « 1,200 » ; 14.4 → « 14,4 » / « 14.4 » ; decimals fixe le nombre de décimales.
  num(n: number, decimals?: number): string
  // « 12,5 m » / « 12.5 m » : les symboles d'unité ne se traduisent pas.
  qty(n: number, unit: string, decimals?: number): string
  compare(a: string, b: string): number
}

const LOCALE: Record<Lang, string> = { fr: 'fr-CA', en: 'en-CA' }
const cache = new Map<Lang, Formatters>()

// Espace ordinaire pour les milliers : les espaces insécables d'Intl compliquent les tests et les CSV.
const plainSpaces = (s: string): string => s.replace(/[  ]/g, ' ')

export function formatters(lang: Lang): Formatters {
  const hit = cache.get(lang)
  if (hit) return hit
  const numbers = new Map<number, Intl.NumberFormat>()
  const collator = new Intl.Collator(LOCALE[lang])
  const num = (n: number, decimals?: number): string => {
    const key = decimals ?? -1
    let f = numbers.get(key)
    if (!f) {
      f = new Intl.NumberFormat(LOCALE[lang], decimals === undefined ? { maximumFractionDigits: 1 } : { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
      numbers.set(key, f)
    }
    return plainSpaces(f.format(n))
  }
  const made: Formatters = { lang, num, qty: (n, unit, decimals) => `${num(n, decimals)} ${unit}`, compare: (a, b) => collator.compare(a, b) }
  cache.set(lang, made)
  return made
}
