import type { Messages } from '../messages'

export const theme: Messages['theme'] = {
  labels: { system: 'System', light: 'Light', dark: 'Dark' },
  current: (p) => `Theme: ${p.label}`,
  switchTo: (p) => `Switch to ${p.label} theme`
}
