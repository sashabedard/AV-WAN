// Bibliothèque perso : userData/library/<id>.json, une composante par fichier (spec plan 4 § 6.4).
// Le renderer ne donne qu'un identifiant validé ici, jamais un chemin. Sans Electron : testable.
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import type { LibraryFile } from '../shared/api'
import { atomicWriteFile } from './fileIO'

export const LIBRARY_ID = /^custom-[A-Za-z0-9_-]{6,40}$/
export const LIBRARY_MAX_BYTES = 2 * 1024 * 1024
export const LIBRARY_MAX_FILES = 500

function assertLibraryId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !LIBRARY_ID.test(id)) throw new Error('Identifiant de composante invalide.')
}

export async function listLibrary(dir: string): Promise<LibraryFile[]> {
  let names: string[]
  try {
    names = await fs.readdir(dir)
  } catch {
    return []
  }
  const out: LibraryFile[] = []
  for (const name of names.sort()) {
    if (out.length >= LIBRARY_MAX_FILES) break
    if (!name.endsWith('.json')) continue
    const id = name.slice(0, -'.json'.length)
    if (!LIBRARY_ID.test(id)) continue
    try {
      const file = join(dir, name)
      if ((await fs.stat(file)).size > LIBRARY_MAX_BYTES) continue
      out.push({ id, text: await fs.readFile(file, 'utf8') })
    } catch {
      // fichier disparu entre la liste et la lecture
    }
  }
  return out
}

export async function saveLibrary(dir: string, id: unknown, text: unknown): Promise<void> {
  assertLibraryId(id)
  if (typeof text !== 'string') throw new Error('Composante invalide.')
  if (Buffer.byteLength(text, 'utf8') > LIBRARY_MAX_BYTES) throw new Error('Composante trop volumineuse (2 Mo au plus).')
  await fs.mkdir(dir, { recursive: true })
  await atomicWriteFile(join(dir, `${id}.json`), text)
}

export async function removeLibrary(dir: string, id: unknown): Promise<void> {
  assertLibraryId(id)
  await fs.rm(join(dir, `${id}.json`), { force: true })
}
