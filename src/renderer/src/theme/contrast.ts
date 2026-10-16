export const PAPER = { dark: '#15181B', light: '#EEEAE0' } as const

function channel(value: number): number {
  const s = value / 255
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  // i18n-ignore : erreur de développeur (jeton de thème mal formé), jamais affichée
  if (!m) throw new Error(`Couleur invalide : ${hex}`)
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => channel(parseInt(h as string, 16))) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}
