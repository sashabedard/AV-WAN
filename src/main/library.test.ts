import { afterAll, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LIBRARY_MAX_BYTES, listLibrary, removeLibrary, saveLibrary } from './library'

const dirs: string[] = []
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
})
function tempDir(): string {
  const d = mkdtempSync(join(tmpdir(), 'avwan-library-'))
  dirs.push(d)
  return d
}

describe('bibliothèque sur disque', () => {
  it('refuse tout identifiant qui n’est pas celui d’une composante', async () => {
    const dir = tempDir()
    for (const id of ['../x', '', 'custom-', 'custom-a/b', `custom-${'a'.repeat(41)}`, 42]) {
      await expect(saveLibrary(dir, id, '{}')).rejects.toThrow('Identifiant de composante invalide.')
    }
    await expect(removeLibrary(dir, '../x')).rejects.toThrow('Identifiant de composante invalide.')
  })

  it('écrit (en créant le dossier), liste par identifiant, puis supprime', async () => {
    const dir = join(tempDir(), 'library')
    await saveLibrary(dir, 'custom-bbbbbb', '{"b":1}')
    await saveLibrary(dir, 'custom-aaaaaa', '{"a":1}')
    expect(await listLibrary(dir)).toEqual([
      { id: 'custom-aaaaaa', text: '{"a":1}' },
      { id: 'custom-bbbbbb', text: '{"b":1}' }
    ])
    await removeLibrary(dir, 'custom-aaaaaa')
    expect((await listLibrary(dir)).map((f) => f.id)).toEqual(['custom-bbbbbb'])
  })

  it('ignore les fichiers étrangers ou trop lourds, et un dossier absent', async () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'notes.txt'), 'x')
    writeFileSync(join(dir, 'autre.json'), '{}')
    writeFileSync(join(dir, 'custom-lourde.json'), 'x'.repeat(LIBRARY_MAX_BYTES + 1))
    expect(await listLibrary(dir)).toEqual([])
    expect(await listLibrary(join(dir, 'absent'))).toEqual([])
  })

  it('refuse une composante trop lourde', async () => {
    await expect(saveLibrary(tempDir(), 'custom-lourde', 'x'.repeat(LIBRARY_MAX_BYTES + 1))).rejects.toThrow('Composante trop volumineuse (2 Mo au plus).')
  })
})
