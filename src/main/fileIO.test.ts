import { afterEach, describe, expect, it, vi } from 'vitest'
import { promises as fsp, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { atomicWriteFile, atomicWriteFileSync, backupFile, backupPathFor, readTextFile } from './fileIO'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('fileIO', () => {
  it('écrit de façon atomique et sans laisser de fichier temporaire', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-io-'))
    const file = join(dir, 'projet.avwan')
    writeFileSync(file, 'ancien')
    await atomicWriteFile(file, 'nouveau é')
    expect(readFileSync(file, 'utf8')).toBe('nouveau é')
    expect(readdirSync(dir)).toEqual(['projet.avwan'])
    expect(await readTextFile(file)).toBe('nouveau é')
  })

  it('écrit de façon atomique en synchrone, sans temporaire, et lève si le dossier manque', () => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-io-'))
    const file = join(dir, 'sync.avwan')
    atomicWriteFileSync(file, 'abc')
    expect(readFileSync(file, 'utf8')).toBe('abc')
    expect(readdirSync(dir)).toEqual(['sync.avwan'])
    const missing = join(dir, 'absent')
    expect(() => atomicWriteFileSync(join(missing, 'x.avwan'), 'abc')).toThrow()
    expect(readdirSync(dir)).toEqual(['sync.avwan'])
  })

  it('crée une copie de sauvegarde *.bak.avwan', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-io-'))
    const file = join(dir, 'lumen.avwan')
    writeFileSync(file, 'v0')
    expect(backupPathFor(file)).toBe(join(dir, 'lumen.bak.avwan'))
    await backupFile(file)
    expect(readFileSync(join(dir, 'lumen.bak.avwan'), 'utf8')).toBe('v0')
  })

  it('écrit aussi des octets (PDF, classeur) de façon atomique', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-io-'))
    const file = join(dir, 'plan.pdf')
    await atomicWriteFile(file, new Uint8Array([0x25, 0x50, 0x44, 0x46]))
    expect(readFileSync(file).toString('latin1')).toBe('%PDF')
  })
})

describe('atomicWriteFile : échecs', () => {
  it("refuse d'écrire dans un dossier inexistant, sans rien laisser derrière", async () => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-io-'))
    await expect(atomicWriteFile(join(dir, 'absent', 'projet.avwan'), 'x')).rejects.toThrow()
    expect(readdirSync(dir)).toEqual([])
  })

  it('nettoie le temporaire quand le renommage échoue (cible = dossier existant)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-io-'))
    mkdirSync(join(dir, 'x.avwan'))
    await expect(atomicWriteFile(join(dir, 'x.avwan'), 'x')).rejects.toThrow()
    expect(readdirSync(dir)).toEqual(['x.avwan'])
  })

  it("nettoie le temporaire et ferme le fichier quand l'écriture échoue en cours de route", async () => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-io-'))
    const file = join(dir, 'projet.avwan')
    writeFileSync(file, 'ancien')
    const realOpen = fsp.open.bind(fsp)
    let closed = false
    vi.spyOn(fsp, 'open').mockImplementation(async (...args: Parameters<typeof fsp.open>) => {
      const handle = await realOpen(...args)
      const realClose = handle.close.bind(handle)
      handle.close = async () => {
        closed = true
        return realClose()
      }
      handle.writeFile = async () => {
        await handle.write('partiel')
        throw new Error('ENOSPC: no space left on device')
      }
      return handle
    })
    await expect(atomicWriteFile(file, 'nouveau')).rejects.toThrow('ENOSPC')
    expect(closed).toBe(true)
    expect(readdirSync(dir)).toEqual(['projet.avwan'])
    expect(readFileSync(file, 'utf8')).toBe('ancien')
  })

  it('synchronise le temporaire sur disque avant de le renommer', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-io-'))
    const file = join(dir, 'projet.avwan')
    const order: string[] = []
    const realOpen = fsp.open.bind(fsp)
    const realRename = fsp.rename.bind(fsp)
    vi.spyOn(fsp, 'open').mockImplementation(async (...args: Parameters<typeof fsp.open>) => {
      const handle = await realOpen(...args)
      const realSync = handle.sync.bind(handle)
      handle.sync = async () => {
        order.push('sync')
        return realSync()
      }
      return handle
    })
    vi.spyOn(fsp, 'rename').mockImplementation(async (from, to) => {
      order.push('rename')
      return realRename(from, to)
    })
    await atomicWriteFile(file, 'données')
    expect(order).toEqual(['sync', 'rename'])
    expect(readFileSync(file, 'utf8')).toBe('données')
  })
})
