// Pluriels : en français 0 et 1 sont au singulier, en anglais seul 1 l'est (Intl.PluralRules).
const fr = new Intl.PluralRules('fr-CA')
const en = new Intl.PluralRules('en-CA')

export const frPlural = (n: number, one: string, other: string): string => (fr.select(n) === 'one' ? one : other)
export const enPlural = (n: number, one: string, other: string): string => (en.select(n) === 'one' ? one : other)
