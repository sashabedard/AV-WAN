export const CURRENT_SCHEMA_VERSION = 1

export type RawDoc = Record<string, unknown> & { schemaVersion: number }

// MIGRATIONS[n] transforme un document de version n en version n + 1.
export const MIGRATIONS: Record<number, (doc: RawDoc) => RawDoc> = {}

export function migrate(doc: RawDoc): RawDoc {
  let current = doc
  while (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[current.schemaVersion]
    if (!step) throw new Error(`Aucune migration depuis la version ${current.schemaVersion}`)
    current = step(current)
  }
  return current
}
