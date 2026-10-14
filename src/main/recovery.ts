// Copies de récupération : userData/recovery/<clé>.json, une par document (spec plan 4 § 5).
// Sans Electron à l'exécution : testable sous Vitest.
import { createHash } from 'node:crypto'
import { promises as fs, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { RecoveryEntry, RecoveryWrite, RestoredRecovery } from '../shared/api'
import { atomicWriteFile } from './fileIO'

export const RECOVERY_MAX_BYTES = 20 * 1024 * 1024
export const RECOVERY_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000
const UNTITLED_ID = /^[A-Za-z0-9_-]{6,40}$/
const KEY = /^(?:f-[0-9a-f]{16}|u-[A-Za-z0-9_-]{6,40})$/

export interface RecoveryDoc {
  version: 1
  path: string | null
  title: string
  savedAt: string
  text: string
}

export function keyForPath(path: string): string {
  return `f-${createHash('sha256').update(path, 'utf8').digest('hex').slice(0, 16)}`
}

export function keyForUntitled(id: string): string {
  if (!UNTITLED_ID.test(id)) throw new Error('Identifiant de document invalide.')
  return `u-${id}`
}

export function isRecoveryKey(key: unknown): key is string {
  return typeof key === 'string' && KEY.test(key)
}

const fileFor = (dir: string, key: string): string => join(dir, `${key}.json`)

export function parseRecoveryWrite(value: unknown): RecoveryWrite {
  const o = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
  if (!o || (o['path'] !== null && typeof o['path'] !== 'string') || typeof o['untitledId'] !== 'string' || typeof o['title'] !== 'string' || typeof o['text'] !== 'string') {
    throw new Error('Copie de récupération invalide.')
  }
  return { path: o['path'] as string | null, untitledId: o['untitledId'], title: o['title'], text: o['text'] }
}

export function parseRecoveryDoc(text: string): RecoveryDoc | null {
  try {
    const v: unknown = JSON.parse(text)
    if (typeof v !== 'object' || v === null) return null
    const d = v as Record<string, unknown>
    if (d['version'] !== 1 || typeof d['title'] !== 'string' || typeof d['text'] !== 'string' || typeof d['savedAt'] !== 'string') return null
    if (d['path'] !== null && typeof d['path'] !== 'string') return null
    if (Number.isNaN(Date.parse(d['savedAt']))) return null
    return { version: 1, path: d['path'] as string | null, title: d['title'], savedAt: d['savedAt'], text: d['text'] }
  } catch {
    return null
  }
}

export async function writeRecovery(dir: string, key: string, doc: RecoveryDoc): Promise<void> {
  if (!isRecoveryKey(key)) throw new Error('Clé de récupération invalide.')
  const body = JSON.stringify(doc)
  if (Buffer.byteLength(body, 'utf8') > RECOVERY_MAX_BYTES) throw new Error('Projet trop volumineux pour la copie de récupération.')
  await fs.mkdir(dir, { recursive: true })
  await atomicWriteFile(fileFor(dir, key), body)
}

export async function readRecovery(dir: string, key: string): Promise<RecoveryDoc | null> {
  if (!isRecoveryKey(key)) return null
  try {
    return parseRecoveryDoc(await fs.readFile(fileFor(dir, key), 'utf8'))
  } catch {
    return null
  }
}

export async function discardRecovery(dir: string, key: string): Promise<void> {
  if (isRecoveryKey(key)) await fs.rm(fileFor(dir, key), { force: true })
}

// Version synchrone : « Quitter sans enregistrer » efface la copie avant que l'app ne se ferme.
export function discardRecoverySync(dir: string, key: string): void {
  if (isRecoveryKey(key)) rmSync(fileFor(dir, key), { force: true })
}

async function mtimeMs(path: string): Promise<number | null> {
  try {
    return (await fs.stat(path)).mtimeMs
  } catch {
    return null
  }
}

// Trop vieille, ou son fichier a été enregistré après elle : la copie n'a plus de raison d'être.
async function isStale(doc: RecoveryDoc, now: number): Promise<boolean> {
  const saved = Date.parse(doc.savedAt)
  if (now - saved > RECOVERY_MAX_AGE_MS) return true
  if (!doc.path) return false
  const m = await mtimeMs(doc.path)
  return m !== null && m > saved
}

const entryOf = (key: string, doc: RecoveryDoc): RecoveryEntry => ({ key, path: doc.path, title: doc.title, savedAt: doc.savedAt })

export async function listRecovery(dir: string, now: number = Date.now()): Promise<RecoveryEntry[]> {
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }
  const out: RecoveryEntry[] = []
  for (const name of names) {
    if (!name.endsWith('.json')) continue
    const key = name.slice(0, -'.json'.length)
    if (!isRecoveryKey(key)) continue
    const doc = await readRecovery(dir, key)
    if (!doc || (await isStale(doc, now))) {
      await discardRecovery(dir, key)
      continue
    }
    out.push(entryOf(key, doc))
  }
  return out.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
}

export async function findNewerRecovery(dir: string, path: string, now: number = Date.now()): Promise<RecoveryEntry | null> {
  const key = keyForPath(path)
  const doc = await readRecovery(dir, key)
  if (!doc || doc.path !== path) return null
  if (await isStale(doc, now)) {
    await discardRecovery(dir, key)
    return null
  }
  return entryOf(key, doc)
}

// Le chemin n'est rendu que si le fichier existe encore ; sinon le projet se restaure sans titre.
export async function prepareRestore(dir: string, key: string): Promise<RestoredRecovery | null> {
  const doc = await readRecovery(dir, key)
  if (!doc) return null
  const path = doc.path && (await mtimeMs(doc.path)) !== null ? doc.path : null
  return { key, path, text: doc.text }
}
