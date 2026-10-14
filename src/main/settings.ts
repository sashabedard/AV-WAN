// Réglages de l'app (pas d'un document) : userData/settings.json. Sans Electron : testable.
import { promises as fs } from 'node:fs'
import { atomicWriteFile } from './fileIO'

export interface Settings {
  autoSave: boolean
}

export const DEFAULT_SETTINGS: Settings = { autoSave: true }

// Un fichier illisible ou une valeur d'un mauvais type redonne la valeur par défaut.
export function parseSettings(text: string): Settings {
  try {
    const v: unknown = JSON.parse(text)
    const o = typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {}
    return { autoSave: typeof o['autoSave'] === 'boolean' ? o['autoSave'] : DEFAULT_SETTINGS.autoSave }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function readSettings(file: string): Promise<Settings> {
  try {
    return parseSettings(await fs.readFile(file, 'utf8'))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function writeSettings(file: string, settings: Settings): Promise<void> {
  await atomicWriteFile(file, `${JSON.stringify(settings, null, 2)}\n`)
}
