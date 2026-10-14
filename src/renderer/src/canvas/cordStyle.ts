import type { Link, Medium, Project } from '../model/types'
import { linkVlanView } from '../model/derive'
import { MEDIUM_LABELS } from '../catalog/labels'

export type ThemeMode = 'dark' | 'light'

export const NEUTRAL = { dark: '#7D848C', light: '#8A847A' } as const
export const TRUNK = { dark: '#ECEAE4', light: '#2B2E33' } as const
const MAX_BANDS = 6

export interface CordStyle {
  color: string
  width: number
  dash?: string
  innerDash: boolean
  bands: string[]
  extraBands: number
  straight: boolean
  plugs: boolean
  badge?: string
}

const COPPER: ReadonlySet<Medium> = new Set(['cat5e', 'cat6', 'cat6a'])
const FIBER: ReadonlySet<Medium> = new Set(['om3', 'om4', 'os2'])

export function cordStyle(project: Project, link: Link, theme: ThemeMode): CordStyle {
  const view = linkVlanView(project, link)
  const vlanColor = (id: number): string | undefined => project.vlans.find((v) => v.id === id)?.color[theme]
  let color: string = NEUTRAL[theme]
  let bands: string[] = []
  let extraBands = 0
  if (view.kind === 'access') {
    color = vlanColor(view.vlan) ?? NEUTRAL[theme]
  } else if (view.kind === 'trunk') {
    color = TRUNK[theme]
    const ids = view.tagged === 'all' ? project.vlans.map((v) => v.id) : view.tagged
    const colors = ids.map(vlanColor).filter((c): c is string => c !== undefined)
    bands = colors.slice(0, MAX_BANDS)
    extraBands = Math.max(0, colors.length - MAX_BANDS)
  }
  const m = link.medium
  if (COPPER.has(m)) return { color, width: 4.5, innerDash: false, bands, extraBands, straight: false, plugs: true }
  if (FIBER.has(m)) return { color, width: 3.2, innerDash: true, bands, extraBands, straight: false, plugs: true }
  if (m === 'dac') return { color, width: 3.2, innerDash: false, bands, extraBands, straight: false, plugs: true }
  if (m === 'wifi') return { color, width: 2, dash: '1.5 5', innerDash: false, bands: [], extraBands: 0, straight: true, plugs: false }
  return { color, width: 2, dash: '8 5', innerDash: false, bands: [], extraBands: 0, straight: false, plugs: false, badge: MEDIUM_LABELS[m].toUpperCase() }
}
