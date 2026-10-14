// src/main/recent.test.ts
import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { RECENT_MAX, existingRecent, parseRecent, pushRecent, readRecent, rememberRecent } from './recent'

describe('fichiers récents', () => {
  it('met le dernier ouvert en tête, sans doublon, 8 au plus', () => {
    let list: string[] = []
    for (let i = 0; i < 10; i++) list = pushRecent(list, `/p/${i}.avwan`)
    list = pushRecent(list, '/p/5.avwan')
    expect(list[0]).toBe('/p/5.avwan')
    expect(list).toHaveLength(RECENT_MAX)
    expect(new Set(list).size).toBe(RECENT_MAX)
  })

  it('ignore une liste illisible ou étrangère', () => {
    expect(parseRecent('pas du json')).toEqual([])
    expect(parseRecent('{"a":1}')).toEqual([])
    expect(parseRecent('["/a.avwan", 3, "/b.txt"]')).toEqual(['/a.avwan'])
  })

  it('écrit la liste et ne rend que les fichiers qui existent encore', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'avwan-recent-'))
    const file = join(dir, 'recent.json')
    const kept = join(dir, 'a.avwan')
    writeFileSync(kept, '{}')
    await rememberRecent(file, join(dir, 'disparu.avwan'))
    await rememberRecent(file, kept)
    expect(await readRecent(file)).toEqual([kept, join(dir, 'disparu.avwan')])
    expect(await existingRecent(file)).toEqual([kept])
  })
})
