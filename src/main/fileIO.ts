import { promises as fs } from 'node:fs'
import { basename, dirname, join } from 'node:path'

export async function atomicWriteFile(path: string, data: string): Promise<void> {
  const tmp = join(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`)
  await fs.writeFile(tmp, data, 'utf8')
  try {
    await fs.rename(tmp, path)
  } catch (e) {
    await fs.rm(tmp, { force: true })
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
