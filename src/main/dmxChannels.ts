// Listes de canaux DMX des réglages (spec canaux-dmx § 3.5) : userData/dmx-channels.json, écrit en entier.
// Le renderer valide chaque entrée ; ici, seulement un objet JSON de taille raisonnable. Sans Electron : testable.
import { promises as fs } from 'node:fs'
import { atomicWriteFile } from './fileIO'
import { mainMessages } from './lang'

export const DMX_CHANNELS_MAX_BYTES = 2 * 1024 * 1024

export async function readDmxChannels(file: string): Promise<string | null> {
  try {
    if ((await fs.stat(file)).size > DMX_CHANNELS_MAX_BYTES) return null
    return await fs.readFile(file, 'utf8')
  } catch {
    return null
  }
}

export async function writeDmxChannels(file: string, text: unknown): Promise<void> {
  if (typeof text !== 'string') throw new Error(mainMessages().errors.invalidChannelLists)
  if (Buffer.byteLength(text, 'utf8') > DMX_CHANNELS_MAX_BYTES) throw new Error(mainMessages().errors.channelListsTooLarge)
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(mainMessages().errors.invalidChannelLists)
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error(mainMessages().errors.invalidChannelLists)
  await atomicWriteFile(file, text)
}
