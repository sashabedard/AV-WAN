import { afterAll, describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_SETTINGS, parseSettings, readSettings, writeSettings } from './settings'

const dirs: string[] = []
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })))
const tempDir = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'avwan-settings-'))
  dirs.push(d)
  return d
}

describe('réglages', () => {
  it('enregistrement automatique actif par défaut, et lecture tolérante', () => {
    expect(DEFAULT_SETTINGS).toEqual({ autoSave: true })
    expect(parseSettings('{pas du json')).toEqual({ autoSave: true })
    expect(parseSettings('{"autoSave": "oui"}')).toEqual({ autoSave: true })
    expect(parseSettings('{"autoSave": false, "autre": 1}')).toEqual({ autoSave: false })
  })

  it('écrit puis relit ; un fichier absent donne les réglages par défaut', async () => {
    const file = join(tempDir(), 'settings.json')
    expect(await readSettings(file)).toEqual({ autoSave: true })
    await writeSettings(file, { autoSave: false })
    expect(await readSettings(file)).toEqual({ autoSave: false })
    writeFileSync(file, 'cassé')
    expect(await readSettings(file)).toEqual({ autoSave: true })
  })

  it('lit la langue choisie et ignore une valeur inconnue (Review Focus 5)', () => {
    expect(parseSettings('{"autoSave":false,"lang":"en"}')).toEqual({ autoSave: false, lang: 'en' })
    expect(parseSettings('{"autoSave":true,"lang":"de"}')).toEqual({ autoSave: true })
    expect(parseSettings('{"lang":42}')).toEqual({ autoSave: true })
    expect(parseSettings('pas du json')).toEqual({ autoSave: true })
  })
})
