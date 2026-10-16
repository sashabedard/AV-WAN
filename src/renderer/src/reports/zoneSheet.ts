// src/renderer/src/reports/zoneSheet.ts
import type { Project, Zone } from '../model/types'
import { portRefLabel } from './format'
import type { Lang } from '../../../shared/i18n/lang'

// Câble qui sort d'une page de zone : deviceId et portId désignent le bout intérieur.
export interface Renvoi {
  linkId: string
  deviceId: string
  portId: string
  label: string
}

// Numéro de page de chaque zone qui a sa propre page dans le PDF (la p. 1 est le schéma d'ensemble).
export function zonePageNumbers(project: Project, zonePages: boolean): Map<string, number> {
  const pages = new Map<string, number>()
  if (!zonePages) return pages
  project.zones.filter((z) => z.ownPdfPage).forEach((z, i) => pages.set(z.id, i + 2))
  return pages
}

// « Salle p. 3 », « Scène p. 1 » (zone sans page : vue d'ensemble), « p. 1 » (hors de toute zone).
export function pageLabel(zone: Zone | undefined, pages: Map<string, number>): string {
  const page = zone ? (pages.get(zone.id) ?? 1) : 1
  return zone ? `${zone.name} p. ${page}` : `p. ${page}`
}

export function zoneSheet(
  project: Project,
  zone: Zone,
  pages: Map<string, number>,
  lang: Lang
): { deviceIds: Set<string>; linkIds: Set<string>; renvois: Renvoi[] } {
  const deviceIds = new Set(project.devices.filter((d) => d.zoneId === zone.id).map((d) => d.id))
  const linkIds = new Set<string>()
  const renvois: Renvoi[] = []
  for (const link of project.links) {
    const aIn = deviceIds.has(link.a.deviceId)
    const bIn = deviceIds.has(link.b.deviceId)
    if (aIn && bIn) {
      linkIds.add(link.id)
      continue
    }
    if (!aIn && !bIn) continue
    const [inner, outer] = aIn ? [link.a, link.b] : [link.b, link.a]
    const outerZone = project.zones.find((z) => z.id === project.devices.find((d) => d.id === outer.deviceId)?.zoneId)
    renvois.push({
      linkId: link.id,
      deviceId: inner.deviceId,
      portId: inner.portId,
      label: `${link.cableId} › ${portRefLabel(project, outer, lang)} · ${pageLabel(outerZone, pages)}`
    })
  }
  return { deviceIds, linkIds, renvois }
}
