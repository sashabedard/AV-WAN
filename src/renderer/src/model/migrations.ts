import { stripWithType } from './led'
import type { Messages } from '../../../shared/i18n/messages'

export const CURRENT_SCHEMA_VERSION = 4

export type RawDoc = Record<string, unknown> & { schemaVersion: number }

// 1 → 2 (patch DMX, bandes LED) : l'« Appareil DMX » devient patchable avec 1 canal ; une ancienne bande
// reçoit sa prise DC et les valeurs du type WS2812B, sans longueur (pas de watts inventés).
export function migrateDeviceV2(device: unknown): unknown {
  if (typeof device !== 'object' || device === null) return device
  const d = device as Record<string, unknown>
  if (d['templateId'] === 'dmx-fixture' && d['dmx'] === undefined) return { ...d, dmx: { footprint: 1 } }
  if (d['templateId'] === 'led-strip' && d['ledStrip'] === undefined) {
    const ports = Array.isArray(d['ports']) ? d['ports'] : []
    const hasDc = ports.some((p) => typeof p === 'object' && p !== null && (p as { id?: unknown }).id === 'DC-IN')
    return { ...d, ports: hasDc ? ports : [...ports, { id: 'DC-IN', label: 'DC IN', connector: 'dc' }], ledStrip: stripWithType(undefined, 'ws2812b') }
  }
  return d
}

const NETWORK = new Set(['rj45', 'sfp', 'sfp+', 'wifi'])
type RawPort = { id?: unknown; connector?: unknown }

// 3 → 4 (IP multiples) : portState[*].ip devient ips ; l'IP d'appareil passe en tête du premier port réseau,
// dans un port RJ45 « NET » créé s'il n'y en a aucun (aucune perte, rien d'autre d'inventé).
export function migrateDeviceV4(device: unknown): unknown {
  if (typeof device !== 'object' || device === null) return device
  const { ip, ...d } = device as Record<string, unknown>
  const state = typeof d['portState'] === 'object' && d['portState'] !== null ? (d['portState'] as Record<string, Record<string, unknown>>) : undefined
  let portState: Record<string, Record<string, unknown>> | undefined = state
  if (state) {
    portState = {}
    for (const [id, s] of Object.entries(state)) {
      const { ip: portIp, ...rest } = s ?? {}
      portState[id] = portIp === undefined ? rest : { ...rest, ips: [portIp] }
    }
  }
  if (ip === undefined) return portState ? { ...d, portState } : d
  let ports = Array.isArray(d['ports']) ? (d['ports'] as RawPort[]) : []
  let net = ports.find((p) => typeof p === 'object' && p !== null && NETWORK.has(p.connector as string))
  if (!net) {
    net = { id: 'NET', label: 'NET', connector: 'rj45' } as RawPort
    ports = [...ports, net]
  }
  const id = net.id as string
  const prev = portState?.[id] ?? {}
  const ips = Array.isArray(prev['ips']) ? prev['ips'] : []
  return { ...d, ports, portState: { ...portState, [id]: { ...prev, ips: [ip, ...ips] } } }
}

// MIGRATIONS[n] transforme un document de version n en version n + 1.
export const MIGRATIONS: Record<number, (doc: RawDoc) => RawDoc> = {
  1: (doc) => ({ ...doc, schemaVersion: 2, ...(Array.isArray(doc['devices']) ? { devices: doc['devices'].map(migrateDeviceV2) } : {}) }),
  // 2 → 3 (canaux DMX nommés) : le champ dmxChannels est facultatif, rien d'autre ne change.
  2: (doc) => ({ ...doc, schemaVersion: 3 }),
  3: (doc) => ({ ...doc, schemaVersion: 4, ...(Array.isArray(doc['devices']) ? { devices: doc['devices'].map(migrateDeviceV4) } : {}) })
}

export function migrate(doc: RawDoc, m: Messages): RawDoc {
  let current = doc
  while (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[current.schemaVersion]
    if (!step) throw new Error(m.model.file.noMigration({ version: current.schemaVersion }))
    current = step(current)
  }
  return current
}
