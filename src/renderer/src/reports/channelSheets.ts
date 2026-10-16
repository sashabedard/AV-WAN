import type { DmxChannelList, Project } from '../model/types'
import type { Cell, Column } from '../../../shared/tables'
import { getTemplate } from '../catalog'
import { displayName } from '../catalog/templateText'
import { modeLabel } from '../catalog/modeLabels'
import { patchIndex, rangeLabel } from '../model/dmx'
import { channelKey, resolveChannels } from '../model/dmxChannels'
import { compareText } from './format'
import { messages, type Messages } from '../../../shared/i18n/messages'
import type { Lang } from '../../../shared/i18n/lang'

export const channelColumns = (m: Messages): Column[] => [m.reports.channels.address, m.reports.channels.channel, m.reports.channels.parameter].map((label) => ({ label }))

export interface ChannelBlock {
  deviceId: string
  title: string
  subtitle: string
  rows: Cell[][]
}

interface Sortable {
  block: ChannelBlock
  universe: number | undefined
  address: number | undefined
  name: string
}

// Section « Canaux DMX » (spec canaux-dmx § 5) : un bloc par appareil dont au moins un canal est nommé.
// Sans réglages (fenêtre d'impression) : les listes viennent du projet, embarquées à l'export, puis du catalogue.
export function channelBlocks(project: Project, lang: Lang, settings: readonly DmxChannelList[] = []): ChannelBlock[] {
  const m = messages(lang)
  const found: Sortable[] = []
  for (const entry of patchIndex(project).entries.values()) {
    const d = entry.device
    const dmx = d.dmx
    const key = channelKey(d)
    if (!dmx || !key) continue
    const names = (resolveChannels(project, settings, key)?.params ?? []).slice(0, dmx.footprint)
    if (!names.some((n) => n !== '')) continue
    const universe = entry.universe?.universe
    const address = dmx.address
    const where = address === undefined ? m.reports.channels.notPatched : `${universe === undefined ? 'U?' : `U${universe}`} · ${rangeLabel(address, address + dmx.footprint - 1)}`
    const t = getTemplate(project, d.templateId)
    const rows: Cell[][] = []
    for (let ch = 1; ch <= dmx.footprint; ch++) rows.push([address === undefined ? null : address + ch - 1, ch, names[ch - 1] ?? ''])
    const subtitle = [d.model ?? t?.model ?? (t ? displayName(t, lang) : ''), dmx.mode ? modeLabel(dmx.mode, lang) : ''].filter(Boolean).join(' · ')
    found.push({ block: { deviceId: d.id, title: `${d.name} · ${where}`, subtitle, rows }, universe, address, name: d.name })
  }
  const placed = (s: Sortable): boolean => s.universe !== undefined && s.address !== undefined
  return found
    .sort((a, b) => {
      if (placed(a) !== placed(b)) return placed(a) ? -1 : 1
      if (placed(a)) return a.universe! - b.universe! || a.address! - b.address! || compareText(a.name, b.name, lang)
      return compareText(a.name, b.name, lang)
    })
    .map((s) => s.block)
}
