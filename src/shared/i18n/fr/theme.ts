// Thème clair / sombre.
export const theme = {
  labels: { system: 'Système', light: 'Clair', dark: 'Sombre' },
  current: (p: { label: string }) => `Thème : ${p.label}`,
  switchTo: (p: { label: string }) => `Passer au thème ${p.label}`
} as const
