// Fenêtre sans barre de titre : les contrôles natifs s'intègrent à la barre de l'app (44 px).
// Sans Electron à l'exécution : testable sous Vitest.
import type { BrowserWindowConstructorOptions } from 'electron'

export const TOP_BAR_HEIGHT = 44

export interface TitleBarColors {
  color: string
  symbolColor: string
}

// Couleurs du thème sombre (jetons --surface et --ink) : le renderer envoie celles du thème réel au démarrage.
const DEFAULT_COLORS: TitleBarColors = { color: '#15181b', symbolColor: '#ece7dc' }

export function chromeOptions(platform: NodeJS.Platform): BrowserWindowConstructorOptions {
  // macOS : les pastilles restent natives, centrées verticalement sur la barre de l'app.
  if (platform === 'darwin') return { titleBarStyle: 'hidden', trafficLightPosition: { x: 16, y: 15 } }
  // Windows : boutons natifs superposés (dispositions d'ancrage de Windows 11 comprises).
  return { titleBarStyle: 'hidden', titleBarOverlay: { ...DEFAULT_COLORS, height: TOP_BAR_HEIGHT } }
}

// Couleur calculée par le navigateur (rgb(…) ou #rrggbb) → #rrggbb ; tout le reste est refusé.
export function cssColorToHex(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (/^#[0-9a-f]{6}$/.test(v)) return v
  const m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/.exec(v)
  if (!m) return null
  const parts = [m[1], m[2], m[3]].map(Number)
  if (parts.some((n) => n > 255)) return null
  return `#${parts.map((n) => n.toString(16).padStart(2, '0')).join('')}`
}

export function titleBarColors(value: unknown): TitleBarColors | null {
  if (typeof value !== 'object' || value === null) return null
  const o = value as Record<string, unknown>
  const color = cssColorToHex(o['color'])
  const symbolColor = cssColorToHex(o['symbolColor'])
  return color && symbolColor ? { color, symbolColor } : null
}

// Position du menu ☰ (Windows), en pixels de la fenêtre.
export function menuPosition(value: unknown): { x: number; y: number } | null {
  if (typeof value !== 'object' || value === null) return null
  const o = value as Record<string, unknown>
  const x = o['x']
  const y = o['y']
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) return null
  return { x: Math.round(x), y: Math.round(y) }
}
