import { afterAll, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readOpenedVersion, rememberOpenedVersion, VERSION_MAX_BYTES } from './versions'

const dirs: string[] = []
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })))
const tempDir = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'avwan-versions-'))
  dirs.push(d)
  return d
}

describe('versions d’ouverture', () => {
  it('écrit puis relit la version d’un chemin', async () => {
    const dir = join(tempDir(), 'versions')
    await rememberOpenedVersion(dir, '/a/projet.avwan', 'contenu A')
    expect(await readOpenedVersion(dir, '/a/projet.avwan')).toBe('contenu A')
  })

  it('la dernière ouverture gagne', async () => {
    const dir = tempDir()
    await rememberOpenedVersion(dir, '/a/projet.avwan', 'v1')
    await rememberOpenedVersion(dir, '/a/projet.avwan', 'v2')
    expect(await readOpenedVersion(dir, '/a/projet.avwan')).toBe('v2')
  })

  it('deux chemins ne se mélangent pas', async () => {
    const dir = tempDir()
    await rememberOpenedVersion(dir, '/a.avwan', 'A')
    await rememberOpenedVersion(dir, '/b.avwan', 'B')
    expect(await readOpenedVersion(dir, '/a.avwan')).toBe('A')
    expect(await readOpenedVersion(dir, '/b.avwan')).toBe('B')
  })

  it('un chemin sans version rend null', async () => {
    expect(await readOpenedVersion(tempDir(), '/inconnu.avwan')).toBeNull()
  })

  it('un texte de plus de 20 Mo n’est pas gardé', async () => {
    const dir = tempDir()
    await rememberOpenedVersion(dir, '/gros.avwan', 'x'.repeat(VERSION_MAX_BYTES + 1))
    expect(await readOpenedVersion(dir, '/gros.avwan')).toBeNull()
  })
})
