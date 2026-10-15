// src/renderer/src/model/dmxChannels.ts
// Canaux DMX nommés (spec canaux-dmx § 3) : une liste par (gabarit, modèle, mode), lue dans le projet,
// puis les réglages (tous les projets), puis le catalogue (manuel du fabricant).
import type { Device, DmxChannelList, Project } from './types'
import { DMX_PARAM_MAX, DmxChannelListSchema } from './schema'
import { getTemplate } from '../catalog'

export interface ChannelKey {
  templateId: string
  model: string
  mode: string
}
export type ChannelSource = 'project' | 'settings' | 'catalog'
export interface ResolvedChannels {
  params: string[]
  source: ChannelSource
}

const MAX_NAMES = 512

export function channelKey(device: Device): ChannelKey | null {
  if (!device.dmx) return null
  return { templateId: device.templateId, model: device.model ?? '', mode: device.dmx.mode ?? '' }
}

export function listKey(list: DmxChannelList): ChannelKey {
  return { templateId: list.templateId, model: list.model ?? '', mode: list.mode ?? '' }
}

export function keyId(key: ChannelKey): string {
  return JSON.stringify([key.templateId, key.model, key.mode])
}

export function sameKey(a: ChannelKey, b: ChannelKey): boolean {
  return a.templateId === b.templateId && a.model === b.model && a.mode === b.mode
}

export function normalizeParams(params: readonly string[]): string[] {
  const out = params.slice(0, MAX_NAMES).map((p) => p.trim().slice(0, DMX_PARAM_MAX))
  while (out.length > 0 && out[out.length - 1] === '') out.pop()
  return out
}

const equalArrays = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((v, i) => v === b[i])

export function sameParams(a: readonly string[], b: readonly string[]): boolean {
  return equalArrays(normalizeParams(a), normalizeParams(b))
}

function toList(key: ChannelKey, params: string[]): DmxChannelList {
  return { templateId: key.templateId, ...(key.model ? { model: key.model } : {}), ...(key.mode ? { mode: key.mode } : {}), params }
}

const findList = (lists: readonly DmxChannelList[] | undefined, key: ChannelKey): DmxChannelList | undefined => lists?.find((l) => sameKey(listKey(l), key))

export function catalogParams(project: Project, key: ChannelKey): string[] | undefined {
  return getTemplate(project, key.templateId)?.dmx?.modes?.find((m) => m.name === key.mode)?.params
}

export function resolveChannels(project: Project, settings: readonly DmxChannelList[], key: ChannelKey): ResolvedChannels | null {
  const own = findList(project.dmxChannels, key)
  if (own) return { params: own.params, source: 'project' }
  const mine = findList(settings, key)
  if (mine) return { params: mine.params, source: 'settings' }
  const catalog = catalogParams(project, key)
  return catalog ? { params: catalog, source: 'catalog' } : null
}

export function upsertList(lists: readonly DmxChannelList[], key: ChannelKey, params: readonly string[]): readonly DmxChannelList[] {
  const next = normalizeParams(params)
  const current = findList(lists, key)
  if (current && equalArrays(current.params, next)) return lists
  return [...lists.filter((l) => !sameKey(listKey(l), key)), toList(key, next)]
}

export function removeList(lists: readonly DmxChannelList[], key: ChannelKey): readonly DmxChannelList[] {
  const kept = lists.filter((l) => !sameKey(listKey(l), key))
  return kept.length === lists.length ? lists : kept
}

// Sans entrée, le champ disparaît du projet (fichier propre, comparaisons simples dans les tests).
function withLists(project: Project, lists: readonly DmxChannelList[]): Project {
  if (lists.length > 0) return { ...project, dmxChannels: [...lists] }
  const { dmxChannels: _gone, ...rest } = project
  return rest
}

export function setProjectList(project: Project, key: ChannelKey, params: readonly string[]): Project {
  const lists = project.dmxChannels ?? []
  const next = upsertList(lists, key, params)
  return next === lists ? project : withLists(project, next)
}

export function removeProjectList(project: Project, key: ChannelKey): Project {
  const lists = project.dmxChannels ?? []
  const next = removeList(lists, key)
  return next === lists ? project : withLists(project, next)
}

// Ajoute les listes dont la clé manque au projet ; une entrée du projet n'est jamais remplacée.
export function mergeProjectLists(project: Project, incoming: readonly DmxChannelList[]): Project {
  const lists = project.dmxChannels ?? []
  const added = incoming.filter((l, i) => !findList(lists, listKey(l)) && incoming.findIndex((m) => sameKey(listKey(m), listKey(l))) === i)
  return added.length === 0 ? project : withLists(project, [...lists, ...added.map((l) => toList(listKey(l), [...l.params]))])
}

const usedKeys = (project: Project): ChannelKey[] =>
  project.devices.flatMap((d) => {
    const k = channelKey(d)
    return k ? [k] : []
  })

// Fichier complet (§ 3.7) : chaque clé utilisée sans entrée reçoit celle des réglages. Le catalogue voyage avec l'app.
export function embedUsedLists(project: Project, settings: readonly DmxChannelList[]): Project {
  if (settings.length === 0) return project
  const wanted = usedKeys(project).flatMap((k) => {
    const mine = findList(settings, k)
    return mine ? [mine] : []
  })
  return mergeProjectLists(project, wanted)
}

export function pruneChannelLists(project: Project): Project {
  const lists = project.dmxChannels
  if (!lists) return project
  const used = new Set(usedKeys(project).map(keyId))
  const kept = lists.filter((l) => used.has(keyId(listKey(l))))
  return kept.length === lists.length ? project : withLists(project, kept)
}

export function sharedCount(project: Project, key: ChannelKey): number {
  return usedKeys(project).filter((k) => sameKey(k, key)).length
}

// Lignes copiées d'un manuel : une par canal ; une ligne de tableau (tabulations) donne sa dernière cellule non vide.
export function pastedNames(text: string): string[] | null {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n')
  if (lines.length < 2) return null
  return lines.map((line) => {
    const name = line.includes('\t') ? (line.split('\t').map((c) => c.trim()).filter(Boolean).pop() ?? '') : line.trim()
    return name.slice(0, DMX_PARAM_MAX)
  })
}

export function fillParams(current: readonly string[], start: number, names: readonly string[], footprint: number): { params: string[]; ignored: number } {
  const params = [...current]
  while (params.length < start) params.push('')
  const used = names.slice(0, Math.max(0, footprint - start))
  used.forEach((n, i) => {
    params[start + i] = n
  })
  return { params, ignored: names.length - used.length }
}

// userData/dmx-channels.json : { lists: [...] }. Une entrée invalide est ignorée ; la dernière d'une clé gagne.
export function parseSettingsLists(text: string | null): DmxChannelList[] {
  if (text === null) return []
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return []
  }
  const items = typeof raw === 'object' && raw !== null && Array.isArray((raw as { lists?: unknown }).lists) ? (raw as { lists: unknown[] }).lists : []
  let lists: readonly DmxChannelList[] = []
  for (const item of items) {
    const r = DmxChannelListSchema.safeParse(item)
    if (r.success) lists = upsertList(lists, listKey(r.data), r.data.params)
  }
  return [...lists]
}

export function serializeSettingsLists(lists: readonly DmxChannelList[]): string {
  return `${JSON.stringify({ lists }, null, 2)}\n`
}
