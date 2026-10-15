import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DMX_CHANNELS_MAX_BYTES, readDmxChannels, writeDmxChannels } from './dmxChannels'

const dirs: string[] = []
const fileIn = (): string => {
  const dir = mkdtempSync(join(tmpdir(), 'avwan-dmx-'))
  dirs.push(dir)
  return join(dir, 'dmx-channels.json')
}
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})

describe('réglages : listes de canaux DMX', () => {
  it('sans fichier : null', async () => {
    expect(await readDmxChannels(fileIn())).toBeNull()
  })

  it('écrit puis relit le même texte', async () => {
    const file = fileIn()
    const text = '{ "lists": [] }\n'
    await writeDmxChannels(file, text)
    expect(await readDmxChannels(file)).toBe(text)
  })

  it('refuse ce qui n’est pas un objet JSON', async () => {
    const file = fileIn()
    await expect(writeDmxChannels(file, 42)).rejects.toThrow('Listes de canaux invalides.')
    await expect(writeDmxChannels(file, 'pas du json')).rejects.toThrow('Listes de canaux invalides.')
    await expect(writeDmxChannels(file, '[1]')).rejects.toThrow('Listes de canaux invalides.')
    expect(await readDmxChannels(file)).toBeNull()
  })

  it('refuse plus de 2 Mo, et ignore un fichier trop gros à la lecture', async () => {
    const file = fileIn()
    const big = `{"x":"${'a'.repeat(DMX_CHANNELS_MAX_BYTES)}"}`
    await expect(writeDmxChannels(file, big)).rejects.toThrow('2 Mo')
    writeFileSync(file, big)
    expect(await readDmxChannels(file)).toBeNull()
  })
})
