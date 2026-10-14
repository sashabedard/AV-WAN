import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { atomicWriteFile, backupFile, backupPathFor, readTextFile } from './fileIO'

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

  it('crée une copie de sauvegarde *.bak.avwan', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-io-'))
    const file = join(dir, 'lumen.avwan')
    writeFileSync(file, 'v0')
    expect(backupPathFor(file)).toBe(join(dir, 'lumen.bak.avwan'))
    await backupFile(file)
    expect(readFileSync(join(dir, 'lumen.bak.avwan'), 'utf8')).toBe('v0')
  })
})
