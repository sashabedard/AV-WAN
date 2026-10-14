// scripts/brand/ico.test.ts
import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { packIco, readIcoDirectory } = require('./ico.cjs') as {
  packIco: (entries: Array<{ size: number; png: Buffer }>) => Buffer
  readIcoDirectory: (buf: Buffer) => Array<{ size: number; bytes: number; offset: number }>
}

describe('packIco', () => {
  it('écrit un en-tête d’icône, un répertoire et les PNG bout à bout', () => {
    const a = Buffer.from('PNG-16')
    const b = Buffer.from('PNG-256-plus-long')
    const ico = packIco([
      { size: 16, png: a },
      { size: 256, png: b }
    ])
    expect(ico.readUInt16LE(0)).toBe(0)
    expect(ico.readUInt16LE(2)).toBe(1)
    expect(ico.readUInt16LE(4)).toBe(2)
    const dir = readIcoDirectory(ico)
    expect(dir).toEqual([
      { size: 16, bytes: a.length, offset: 6 + 2 * 16 },
      { size: 256, bytes: b.length, offset: 6 + 2 * 16 + a.length }
    ])
    expect(ico.subarray(dir[1]!.offset, dir[1]!.offset + dir[1]!.bytes).toString()).toBe('PNG-256-plus-long')
  })

  it('refuse une taille hors de 1 à 256', () => {
    expect(() => packIco([{ size: 300, png: Buffer.from('x') }])).toThrow('Taille d’icône invalide')
  })
})
