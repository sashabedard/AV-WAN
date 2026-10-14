// Version d'ouverture : le fichier tel qu'il était à son ouverture, une par chemin, dans userData/versions.
// Sans Electron : testable.
import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { atomicWriteFile } from './fileIO'
import { keyForPath } from './recovery'

export const VERSION_MAX_BYTES = 20 * 1024 * 1024

const fileFor = (dir: string, path: string): string => join(dir, `${keyForPath(path)}.avwan`)

export async function rememberOpenedVersion(dir: string, path: string, text: string): Promise<void> {
  if (Buffer.byteLength(text, 'utf8') > VERSION_MAX_BYTES) return
  await fs.mkdir(dir, { recursive: true })
  await atomicWriteFile(fileFor(dir, path), text)
}

export async function readOpenedVersion(dir: string, path: string): Promise<string | null> {
  try {
    return await fs.readFile(fileFor(dir, path), 'utf8')
  } catch {
    return null
  }
}
