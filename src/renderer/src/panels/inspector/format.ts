// src/renderer/src/panels/inspector/format.ts
import type { Device, PortState, Project } from '../../model/types'
import { findPort, linksOnPort, portDisplayLabel } from '../../model/rules'
import type { Messages } from '../../../../shared/i18n/messages'

// « A · 40 » (accès) ou « T · 10 / 30, 40 » (trunk : natif / étiquetés).
export function portVlanSummary(st: PortState | undefined, words: { vlanAll: string; vlanNone: string }): string {
  if (!st) return ''
  if (st.mode === 'trunk') {
    const tagged = st.taggedVlans === undefined || st.taggedVlans === 'all' ? words.vlanAll : st.taggedVlans.length > 0 ? st.taggedVlans.join(', ') : words.vlanNone
    return `T · ${st.nativeVlan ?? '—'} / ${tagged}`
  }
  return st.nativeVlan !== undefined ? `A · ${st.nativeVlan}` : ''
}

// Tous les pairs d'un port (une radio de point d'accès peut en avoir plusieurs).
export function peersOf(project: Project, device: Device, portId: string, m: Messages): string {
  const names = linksOnPort(project, { deviceId: device.id, portId }).map((l) => {
    const other = l.a.deviceId === device.id && l.a.portId === portId ? l.b : l.a
    const found = findPort(project, other)
    return found ? `${found.device.name} · ${portDisplayLabel(found.device, found.port, m)}` : '?'
  })
  return names.length > 0 ? names.join(', ') : '—'
}
