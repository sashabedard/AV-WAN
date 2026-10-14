import { randomUUID } from 'node:crypto'
import { closeSync, fsyncSync, openSync, renameSync, rmSync, writeFileSync, promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'

// Écriture atomique : le contenu est écrit puis synchronisé sur disque (fsync) dans un fichier
// temporaire voisin, puis renommé. Quoi qu'il arrive, le temporaire est supprimé en cas d'échec.
export async function atomicWriteFile(path: string, data: string | Uint8Array): Promise<void> {
  const tmp = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`)
  try {
    const handle = await fs.open(tmp, 'w')
    try {
      if (typeof data === 'string') await handle.writeFile(data, 'utf8')
      else await handle.writeFile(data)
      await handle.sync()
    } finally {
      await handle.close()
    }
    await fs.rename(tmp, path)
  } catch (e) {
    await fs.rm(tmp, { force: true }).catch(() => undefined)
    throw e
  }
}

// Version synchrone, pour la fermeture de la fenêtre : le processus attend la fin de l'écriture.
export function atomicWriteFileSync(path: string, data: string): void {
  const tmp = join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`)
  try {
    const fd = openSync(tmp, 'w')
    try {
      writeFileSync(fd, data, 'utf8')
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
    renameSync(tmp, path)
  } catch (e) {
    try {
      rmSync(tmp, { force: true })
    } catch {
      // le temporaire n'a peut-être jamais existé
    }
    throw e
  }
}

export async function readTextFile(path: string): Promise<string> {
  return fs.readFile(path, 'utf8')
}

export function backupPathFor(path: string): string {
  return `${path.replace(/\.avwan$/i, '')}.bak.avwan`
}

export async function backupFile(path: string): Promise<string> {
  const dest = backupPathFor(path)
  await fs.copyFile(path, dest)
  return dest
}
