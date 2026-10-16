// src/renderer/src/canvas/cordStyle.ts
import type { Link, Medium, Project } from '../model/types'
import { linkVlanView } from '../model/derive'
import { mediumLabel } from '../catalog/labels'
import { messages } from '../../../shared/i18n/messages'
import type { Lang } from '../../../shared/i18n/lang'
import type { Messages } from '../../../shared/i18n/messages'

export type ThemeMode = 'dark' | 'light'
export type MediumKind = 'copper' | 'multimode' | 'singlemode' | 'dac' | 'wifi' | 'simple'

export const NEUTRAL = { dark: '#7D848C', light: '#8A847A' } as const
export const TRUNK = { dark: '#ECEAE4', light: '#2B2E33' } as const
const MAX_BANDS = 6

// Mode « Type » (spec § 8.5) : cuivre acier, multimode aqua, monomode jaune, DAC argent, Wi-Fi violet, liens simples brun.
export const TYPE_COLORS: Record<MediumKind, { dark: string; light: string }> = {
  copper: { dark: '#9AA4AE', light: '#56606A' },
  multimode: { dark: '#36C2C9', light: '#0F7A80' },
  singlemode: { dark: '#F2C94C', light: '#8A6A00' },
  dac: { dark: '#C9CED4', light: '#6E757D' },
  wifi: { dark: '#A78BFA', light: '#6E4FD0' },
  simple: { dark: '#C08A5B', light: '#8B5A2B' }
}
export const MEDIUM_KIND_ORDER: readonly MediumKind[] = ['copper', 'multimode', 'singlemode', 'dac', 'wifi', 'simple']
export const mediumKindLabels = (m: Messages): Record<MediumKind, string> => m.canvas.mediumKinds

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
  alwaysTag: boolean // mode Port : étiquette et ports affichés en permanence
}

const COPPER: ReadonlySet<Medium> = new Set(['cat5e', 'cat6', 'cat6a'])
const FIBER: ReadonlySet<Medium> = new Set(['om3', 'om4', 'os2'])

export function mediumKind(m: Medium): MediumKind {
  if (COPPER.has(m)) return 'copper'
  if (m === 'om3' || m === 'om4') return 'multimode'
  if (m === 'os2') return 'singlemode'
  if (m === 'dac' || m === 'wifi') return m
  return 'simple'
}

// `lang` : langue de l'interface, pour l'étiquette de certains câbles (« Série » / « Serial »).
export function cordStyle(project: Project, link: Link, theme: ThemeMode, lang: Lang = 'fr'): CordStyle {
  const mode = project.settings.colorMode
  let color: string = NEUTRAL[theme]
  let bands: string[] = []
  let extraBands = 0
  if (mode === 'vlan') {
    const view = linkVlanView(project, link)
    const vlanColor = (id: number): string | undefined => project.vlans.find((v) => v.id === id)?.color[theme]
    if (view.kind === 'access') {
      color = vlanColor(view.vlan) ?? NEUTRAL[theme]
    } else if (view.kind === 'trunk') {
      color = TRUNK[theme]
      const ids = view.tagged === 'all' ? project.vlans.map((v) => v.id) : view.tagged
      const colors = ids.map(vlanColor).filter((c): c is string => c !== undefined)
      bands = colors.slice(0, MAX_BANDS)
      extraBands = Math.max(0, colors.length - MAX_BANDS)
    }
  } else if (mode === 'type') {
    color = TYPE_COLORS[mediumKind(link.medium)][theme]
  }
  const alwaysTag = mode === 'port'
  const m = link.medium
  if (COPPER.has(m)) return { color, width: 4.5, innerDash: false, bands, extraBands, straight: false, plugs: true, alwaysTag }
  if (FIBER.has(m)) return { color, width: 3.2, innerDash: true, bands, extraBands, straight: false, plugs: true, alwaysTag }
  if (m === 'dac') return { color, width: 3.2, innerDash: false, bands, extraBands, straight: false, plugs: true, alwaysTag }
  if (m === 'wifi') return { color, width: 2, dash: '1.5 5', innerDash: false, bands: [], extraBands: 0, straight: true, plugs: false, alwaysTag }
  return { color, width: 2, dash: '8 5', innerDash: false, bands: [], extraBands: 0, straight: false, plugs: false, badge: m === 'dc' ? 'DC' : mediumLabel(m, messages(lang)).toUpperCase(), alwaysTag }
}
