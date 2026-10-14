// src/main/recent.ts
import { promises as fs } from 'node:fs'
import { atomicWriteFile } from './fileIO'

export const RECENT_MAX = 8

export function pushRecent(list: readonly string[], path: string, max = RECENT_MAX): string[] {
  return [path, ...list.filter((p) => p !== path)].slice(0, max)
}

export function parseRecent(text: string): string[] {
  try {
    const v: unknown = JSON.parse(text)
    if (!Array.isArray(v)) return []
    return v.filter((x): x is string => typeof x === 'string' && x.toLowerCase().endsWith('.avwan')).slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

export async function readRecent(file: string): Promise<string[]> {
  try {
    return parseRecent(await fs.readFile(file, 'utf8'))
  } catch {
    return []
  }
}

export async function rememberRecent(file: string, path: string): Promise<string[]> {
  const next = pushRecent(await readRecent(file), path)
  await atomicWriteFile(file, `${JSON.stringify(next, null, 2)}\n`)
  return next
}

// Seulement les fichiers encore présents sur le disque (un fichier déplacé disparaît de l'accueil).
export async function existingRecent(file: string): Promise<string[]> {
  const out: string[] = []
  for (const p of await readRecent(file)) {
    try {
      await fs.access(p)
      out.push(p)
    } catch {
      // fichier déplacé ou supprimé
    }
  }
  return out
}
