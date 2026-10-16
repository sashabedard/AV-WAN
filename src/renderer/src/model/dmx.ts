// src/renderer/src/model/dmx.ts
// Patch DMX (spec patch-puissance-catalogue § 4) : univers effectif, plages occupées, chevauchements,
// adresse suivante libre. Fonctions pures. Jamais de test « falsy » sur un univers : U0 existe (Art-Net).
import type { Device, PortDef, PortRef, Project } from './types'
import { stripPixels, type StripPixels } from './led'
import { getTemplate } from '../catalog'
import type { Messages } from '../../../shared/i18n/messages'

export const DMX_SLOTS = 512
export const UNIVERSE_MAX = 63999

export type UniverseSource = { kind: 'typed' } | { kind: 'port'; ref: PortRef }
export interface ResolvedUniverse {
  universe: number
  source: UniverseSource
}
export interface PatchRange {
  ownerId: string
  universe: number
  start: number
  end: number // inclus ; peut dépasser 512
}
export interface PatchEntry {
  device: Device
  universe?: ResolvedUniverse
  range?: PatchRange
  cableUniverse?: number // univers que donnerait le câble, quand il contredit l'univers tapé
}
export interface StripSpan {
  universe: number
  pixels: number
  channels: number
}
export interface StripPatch {
  device: Device
  source: PortRef
  spans: StripSpan[]
}
// Mis en cache par projet (voir patchIndex) : en lecture seule, jamais modifié après coup.
export interface PatchIndex {
  readonly entries: ReadonlyMap<string, PatchEntry>
  readonly ranges: readonly PatchRange[]
  readonly byId: ReadonlyMap<string, Device>
  readonly strips: ReadonlyMap<string, StripPatch>
}
export interface Overlap {
  name: string
  start: number
  end: number
}
export interface PatchIssues {
  overlaps: Overlap[]
  overflow: boolean
  universeConflict?: { typed: number; cable: number }
}

export function isPatchable(device: Device): boolean {
  return device.dmx !== undefined
}

// Sortie d'univers (§ 3.3) : prise DMX d'un appareil non patchable, ou prise pixel d'un appareil d'éclairage
// non patchable qui n'est pas une bande LED. Les sorties d'un processeur LED (Vidéo) portent des données
// propriétaires vers les dalles, pas des univers.
export function isUniverseOutput(project: Project, device: Device, port: PortDef): boolean {
  if (isPatchable(device)) return false
  if (port.connector === 'dmx') return true
  if (port.connector !== 'pixel' || device.ledStrip !== undefined || device.templateId === 'led-strip') return false
  return getTemplate(project, device.templateId)?.category === 'eclairage'
}

function deviceMap(project: Project): Map<string, Device> {
  return new Map(project.devices.map((d) => [d.id, d]))
}

function portOf(byId: ReadonlyMap<string, Device>, ref: PortRef): { device: Device; port: PortDef } | undefined {
  const device = byId.get(ref.deviceId)
  const port = device?.ports.find((p) => p.id === ref.portId)
  return device && port ? { device, port } : undefined
}

// Câbles de chaque appareil, par leur rang dans project.links (croissant) : le parcours ne relit pas tout le projet.
export type LinkAdjacency = ReadonlyMap<string, readonly number[]>

export function linkAdjacency(project: Project): LinkAdjacency {
  const adjacency = new Map<string, number[]>()
  project.links.forEach((link, i) => {
    for (const id of new Set([link.a.deviceId, link.b.deviceId])) {
      const list = adjacency.get(id)
      if (list) list.push(i)
      else adjacency.set(id, [i])
    }
  })
  return adjacency
}

// Univers donné par les câbles DMX, sans regarder la valeur tapée de l'appareil de départ.
function cableUniverse(project: Project, start: Device, byId: ReadonlyMap<string, Device>, adjacency: LinkAdjacency): ResolvedUniverse | undefined {
  const seen = new Set<string>([start.id])
  let frontier = new Set<string>([start.id])
  while (frontier.size > 0) {
    const next = new Set<string>()
    const level = [...new Set([...frontier].flatMap((id) => adjacency.get(id) ?? []))].sort((a, b) => a - b)
    for (const i of level) {
      const link = project.links[i]!
      for (const [here, there] of [
        [link.a, link.b],
        [link.b, link.a]
      ] as const) {
        if (!frontier.has(here.deviceId)) continue
        const from = portOf(byId, here)
        const to = portOf(byId, there)
        if (!from || !to || from.port.connector !== 'dmx' || to.port.connector !== 'dmx') continue
        if (isPatchable(to.device)) {
          if (!seen.has(to.device.id)) {
            seen.add(to.device.id)
            next.add(to.device.id)
          }
          continue
        }
        const universe = to.device.portState[there.portId]?.universe
        if (universe !== undefined) return { universe, source: { kind: 'port', ref: there } }
      }
    }
    frontier = next
  }
  return undefined
}

// § 4.1 : l'univers tapé, sinon le long des câbles DMX en traversant les appareils patchables, niveau par
// niveau (la source la plus proche gagne) ; dans un niveau, l'ordre des câbles du projet départage.
export function resolveUniverse(
  project: Project,
  deviceId: string,
  byId: ReadonlyMap<string, Device> = deviceMap(project),
  adjacency: LinkAdjacency = linkAdjacency(project)
): ResolvedUniverse | undefined {
  const start = byId.get(deviceId)
  if (!start?.dmx) return undefined
  if (start.dmx.universe !== undefined) return { universe: start.dmx.universe, source: { kind: 'typed' } }
  return cableUniverse(project, start, byId, adjacency)
}

// § 4.2 : univers de départ d'une bande pixel, lu sur la sortie pixel où elle est branchée.
export function stripStart(
  project: Project,
  device: Device,
  byId: ReadonlyMap<string, Device> = deviceMap(project),
  adjacency: LinkAdjacency = linkAdjacency(project)
): { universe: number; ref: PortRef } | undefined {
  for (const i of adjacency.get(device.id) ?? []) {
    const link = project.links[i]!
    for (const [here, there] of [
      [link.a, link.b],
      [link.b, link.a]
    ] as const) {
      if (here.deviceId !== device.id) continue
      const from = portOf(byId, here)
      const to = portOf(byId, there)
      if (!from || !to || from.port.connector !== 'pixel' || to.port.connector !== 'pixel') continue
      const universe = to.device.portState[there.portId]?.universe
      if (universe !== undefined) return { universe, ref: there }
    }
  }
  return undefined
}

// Univers consécutifs à partir du départ ; chacun prend ses canaux à partir de 1.
export function stripSpans(px: StripPixels, start: number): StripSpan[] {
  const spans: StripSpan[] = []
  let left = px.pixels
  for (let universe = start; left > 0 && universe <= UNIVERSE_MAX; universe++) {
    const pixels = Math.min(left, px.perUniverse)
    spans.push({ universe, pixels, channels: pixels * px.channelsPerPixel })
    left -= pixels
  }
  return spans
}

// Les projets de l'historique sont immuables : un index par projet, partagé par le canvas, l'inspecteur et les rapports.
const indexCache = new WeakMap<Project, PatchIndex>()

// Univers effectif et plage de chaque appareil patchable, calculés une fois pour tout le projet.
export function patchIndex(project: Project): PatchIndex {
  const hit = indexCache.get(project)
  if (hit) return hit
  const index = buildPatchIndex(project)
  indexCache.set(project, index)
  return index
}

function buildPatchIndex(project: Project): PatchIndex {
  const byId = deviceMap(project)
  const adjacency = linkAdjacency(project)
  const entries = new Map<string, PatchEntry>()
  const ranges: PatchRange[] = []
  const strips = new Map<string, StripPatch>()
  for (const device of project.devices) {
    if (device.ledStrip) {
      const px = stripPixels(device.ledStrip)
      const start = px ? stripStart(project, device, byId, adjacency) : undefined
      if (px && start) {
        const spans = stripSpans(px, start.universe)
        strips.set(device.id, { device, source: start.ref, spans })
        for (const s of spans) ranges.push({ ownerId: device.id, universe: s.universe, start: 1, end: s.channels })
      }
    }
    if (!device.dmx) continue
    const universe = resolveUniverse(project, device.id, byId, adjacency)
    const address = device.dmx.address
    const range: PatchRange | undefined =
      universe && address !== undefined ? { ownerId: device.id, universe: universe.universe, start: address, end: address + device.dmx.footprint - 1 } : undefined
    if (range) ranges.push(range)
    // Univers tapé (une copie le fige) : le câble peut en donner un autre ; l'univers tapé reste celui du patch.
    const cable = device.dmx.universe !== undefined ? cableUniverse(project, device, byId, adjacency)?.universe : undefined
    const conflict = cable !== undefined && cable !== device.dmx.universe
    entries.set(device.id, { device, ...(universe ? { universe } : {}), ...(range ? { range } : {}), ...(conflict ? { cableUniverse: cable } : {}) })
  }
  return { entries, ranges, byId, strips }
}

const byName = (a: Overlap, b: Overlap): number => a.start - b.start || a.name.localeCompare(b.name, 'fr-CA', { numeric: true })

// Plages d'autres propriétaires qui touchent [start, end] dans un univers.
export function overlapsIn(index: PatchIndex, universe: number, start: number, end: number, ownerId: string): Overlap[] {
  return index.ranges
    .filter((r) => r.ownerId !== ownerId && r.universe === universe && r.start <= end && start <= r.end)
    .map((r) => ({ name: index.byId.get(r.ownerId)?.name ?? '?', start: r.start, end: r.end }))
    .sort(byName)
}

export function patchIssues(index: PatchIndex, deviceId: string): PatchIssues {
  const entry = index.entries.get(deviceId)
  const typed = entry?.device.dmx?.universe
  const conflict = typed !== undefined && entry?.cableUniverse !== undefined ? { universeConflict: { typed, cable: entry.cableUniverse } } : {}
  const own = entry?.range
  if (!own) return { overlaps: [], overflow: false, ...conflict }
  return { overlaps: overlapsIn(index, own.universe, own.start, own.end, deviceId), overflow: own.end > DMX_SLOTS, ...conflict }
}

// § 4.4 : première adresse dont la plage tient dans 1…512 sans toucher une plage occupée.
export function nextFreeAddress(index: PatchIndex, universe: number, footprint: number, excludeId?: string): number | undefined {
  const taken = index.ranges.filter((r) => r.universe === universe && r.ownerId !== excludeId).sort((a, b) => a.start - b.start)
  let candidate = 1
  for (const r of taken) {
    if (candidate + footprint - 1 < r.start) break
    candidate = Math.max(candidate, r.end + 1)
  }
  return candidate + footprint - 1 <= DMX_SLOTS ? candidate : undefined
}

// Code de la source « univers tapé » (anglais, jamais affiché tel quel) ; une source par câble donne « Appareil › port », un nom propre.
export const TYPED_SOURCE = 'typed'

export function sourceLabel(project: Project, source: UniverseSource): string {
  if (source.kind === 'typed') return TYPED_SOURCE
  const device = project.devices.find((d) => d.id === source.ref.deviceId)
  const port = device?.ports.find((p) => p.id === source.ref.portId)
  return `${device?.name ?? '?'} › ${port?.label ?? source.ref.portId}`
}

// Libellé affiché d'un résultat de sourceLabel : le code devient un texte de la langue, un chemin d'appareil reste tel quel.
export function sourceText(label: string, m: Messages): string {
  return label === TYPED_SOURCE ? m.model.dmxSource.typed : label
}

export function rangeLabel(start: number, end: number): string {
  return start === end ? String(start) : `${start}–${end}`
}

// 2ᵉ ligne d'une tuile patchable (§ 4.7).
export function patchLine(entry: PatchEntry | undefined, m: Messages): string {
  const address = entry?.device.dmx?.address
  if (address === undefined) return ''
  return entry?.universe ? `U${entry.universe.universe} · ${address}` : `${m.model.dmx.addressShort} ${address}`
}

export function issueTexts(issues: PatchIssues, m: Messages): string[] {
  const c = issues.universeConflict
  return [
    ...(c ? [m.model.dmx.universeConflict({ typed: c.typed, cable: c.cable })] : []),
    ...issues.overlaps.map((o) => m.model.dmx.overlap({ name: o.name, range: rangeLabel(o.start, o.end) })),
    ...(issues.overflow ? [m.model.dmx.overflow] : [])
  ]
}
