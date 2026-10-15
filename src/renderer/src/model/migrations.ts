export const CURRENT_SCHEMA_VERSION = 2

export type RawDoc = Record<string, unknown> & { schemaVersion: number }

// 1 → 2 (patch DMX) : l'« Appareil DMX » devient patchable avec 1 canal. Exportée : la partie B la complète.
export function migrateDeviceV2(device: unknown): unknown {
  if (typeof device !== 'object' || device === null) return device
  const d = device as Record<string, unknown>
  if (d['templateId'] === 'dmx-fixture' && d['dmx'] === undefined) return { ...d, dmx: { footprint: 1 } }
  return d
}

// MIGRATIONS[n] transforme un document de version n en version n + 1.
export const MIGRATIONS: Record<number, (doc: RawDoc) => RawDoc> = {
  1: (doc) => ({ ...doc, schemaVersion: 2, ...(Array.isArray(doc['devices']) ? { devices: doc['devices'].map(migrateDeviceV2) } : {}) })
}

export function migrate(doc: RawDoc): RawDoc {
  let current = doc
  while (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[current.schemaVersion]
    if (!step) throw new Error(`Aucune migration depuis la version ${current.schemaVersion}`)
    current = step(current)
  }
  return current
}
