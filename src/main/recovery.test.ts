import { afterAll, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readdirSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  RECOVERY_MAX_AGE_MS,
  RECOVERY_MAX_BYTES,
  findNewerRecovery,
  isRecoveryKey,
  keyForPath,
  keyForUntitled,
  listRecovery,
  parseRecoveryWrite,
  prepareRestore,
  writeRecovery,
  type RecoveryDoc
} from './recovery'

const dirs: string[] = []
afterAll(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true })
})
function tempDir(): string {
  const d = mkdtempSync(join(tmpdir(), 'avwan-recovery-'))
  dirs.push(d)
  return d
}
const NOW = Date.parse('2026-10-14T12:00:00.000Z')
const iso = (ms: number): string => new Date(ms).toISOString()
const doc = (path: string | null, savedAt: number, title = 'Salle B'): RecoveryDoc => ({ version: 1, path, title, savedAt: iso(savedAt), text: '{"projet":1}' })

describe('clés', () => {
  it('une clé de chemin est stable, courte et distincte d’un chemin à l’autre', () => {
    expect(keyForPath('/x/a.avwan')).toMatch(/^f-[0-9a-f]{16}$/)
    expect(keyForPath('/x/a.avwan')).toBe(keyForPath('/x/a.avwan'))
    expect(keyForPath('/x/b.avwan')).not.toBe(keyForPath('/x/a.avwan'))
  })

  it('refuse un identifiant sans titre dangereux', () => {
    expect(keyForUntitled('Ab3_x-9Zq1')).toBe('u-Ab3_x-9Zq1')
    expect(() => keyForUntitled('../x')).toThrow('Identifiant de document invalide.')
    expect(isRecoveryKey('../etc/passwd')).toBe(false)
    expect(isRecoveryKey('f-xyz')).toBe(false)
    expect(isRecoveryKey(42)).toBe(false)
  })

  it('valide la demande d’écriture du renderer', () => {
    expect(parseRecoveryWrite({ path: null, untitledId: 'abcdef', title: 'T', text: '{}' })).toEqual({ path: null, untitledId: 'abcdef', title: 'T', text: '{}' })
    expect(() => parseRecoveryWrite({ path: 3, untitledId: 'abcdef', title: 'T', text: '{}' })).toThrow('Copie de récupération invalide.')
    expect(() => parseRecoveryWrite(null)).toThrow('Copie de récupération invalide.')
  })
})

describe('écriture et liste', () => {
  it('liste les copies, la plus récente en tête, sans leur texte', async () => {
    const dir = tempDir()
    await writeRecovery(dir, keyForUntitled('aaaaaa'), doc(null, NOW - 120_000, 'Ancien'))
    await writeRecovery(dir, keyForUntitled('bbbbbb'), doc(null, NOW - 60_000, 'Récent'))
    expect(await listRecovery(dir, NOW)).toEqual([
      { key: 'u-bbbbbb', path: null, title: 'Récent', savedAt: iso(NOW - 60_000) },
      { key: 'u-aaaaaa', path: null, title: 'Ancien', savedAt: iso(NOW - 120_000) }
    ])
  })

  it('supprime les copies illisibles et laisse les fichiers étrangers', async () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'u-cassee.json'), '{pas du json')
    writeFileSync(join(dir, 'u-forme1.json'), JSON.stringify({ version: 1, path: 3 }))
    writeFileSync(join(dir, 'notes.txt'), 'à garder')
    expect(await listRecovery(dir, NOW)).toEqual([])
    expect(readdirSync(dir).sort()).toEqual(['notes.txt'])
  })

  it('supprime une copie plus vieille que 30 jours', async () => {
    const dir = tempDir()
    await writeRecovery(dir, keyForUntitled('vieille'), doc(null, NOW - RECOVERY_MAX_AGE_MS - 1))
    expect(await listRecovery(dir, NOW)).toEqual([])
    expect(readdirSync(dir)).toEqual([])
  })

  it('supprime sans bruit une copie dont le fichier a été enregistré depuis', async () => {
    const dir = tempDir()
    const file = join(tempDir(), 'a.avwan')
    writeFileSync(file, '{}')
    utimesSync(file, new Date(NOW - 10_000), new Date(NOW - 10_000))
    await writeRecovery(dir, keyForPath(file), doc(file, NOW - 60_000))
    expect(await listRecovery(dir, NOW)).toEqual([])
    expect(existsSync(join(dir, `${keyForPath(file)}.json`))).toBe(false)
  })

  it('garde une copie dont le fichier a disparu (elle se restaurera sans titre)', async () => {
    const dir = tempDir()
    const gone = join(tempDir(), 'disparu.avwan')
    await writeRecovery(dir, keyForPath(gone), doc(gone, NOW - 60_000))
    expect((await listRecovery(dir, NOW)).map((e) => e.path)).toEqual([gone])
  })

  it('refuse une copie trop lourde', async () => {
    const big: RecoveryDoc = { ...doc(null, NOW), text: 'x'.repeat(RECOVERY_MAX_BYTES) }
    await expect(writeRecovery(tempDir(), keyForUntitled('lourde'), big)).rejects.toThrow('Projet trop volumineux pour la copie de récupération.')
  })
})

describe('ouverture d’un fichier qui a une copie', () => {
  it('rend la copie si elle est plus récente que le fichier', async () => {
    const dir = tempDir()
    const file = join(tempDir(), 'a.avwan')
    writeFileSync(file, '{}')
    utimesSync(file, new Date(NOW - 120_000), new Date(NOW - 120_000))
    await writeRecovery(dir, keyForPath(file), doc(file, NOW - 60_000))
    expect(await findNewerRecovery(dir, file, NOW)).toEqual({ key: keyForPath(file), path: file, title: 'Salle B', savedAt: iso(NOW - 60_000) })
  })

  it('efface la copie si le fichier est plus récent, et ne rend rien sans copie', async () => {
    const dir = tempDir()
    const file = join(tempDir(), 'a.avwan')
    writeFileSync(file, '{}')
    utimesSync(file, new Date(NOW - 1_000), new Date(NOW - 1_000))
    await writeRecovery(dir, keyForPath(file), doc(file, NOW - 60_000))
    expect(await findNewerRecovery(dir, file, NOW)).toBeNull()
    expect(readdirSync(dir)).toEqual([])
    expect(await findNewerRecovery(dir, join(tempDir(), 'autre.avwan'), NOW)).toBeNull()
  })
})

describe('restauration', () => {
  it('rend le chemin seulement s’il existe encore', async () => {
    const dir = tempDir()
    const file = join(tempDir(), 'a.avwan')
    writeFileSync(file, '{}')
    const gone = join(tempDir(), 'disparu.avwan')
    await writeRecovery(dir, keyForPath(file), doc(file, NOW))
    await writeRecovery(dir, keyForPath(gone), doc(gone, NOW))
    expect(await prepareRestore(dir, keyForPath(file))).toEqual({ key: keyForPath(file), path: file, text: '{"projet":1}' })
    expect(await prepareRestore(dir, keyForPath(gone))).toEqual({ key: keyForPath(gone), path: null, text: '{"projet":1}' })
    expect(await prepareRestore(dir, 'u-inconnue')).toBeNull()
  })
})
