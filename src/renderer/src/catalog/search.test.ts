// src/renderer/src/catalog/search.test.ts
import { describe, expect, it } from 'vitest'
import { normalizeText, searchTemplates } from './search'
import { TEMPLATES } from './templates'

const ids = (q: string): string[] => searchTemplates(q).map((t) => t.id)

describe('searchTemplates', () => {
  it('trouve la caméra PTZ avec « ptz »', () => {
    expect(ids('ptz')[0]).toBe('ptz-ndi')
  })

  it('met l’ESP32-POE en tête pour « esp32 poe » (tous les mots doivent correspondre)', () => {
    expect(ids('esp32 poe')[0]).toBe('esp32-poe')
    expect(ids('esp32 poe')).not.toContain('m5-atom-poe')
  })

  it('regroupe les produits Dante en tête', () => {
    expect(ids('dante').slice(0, 4).sort()).toEqual(['dante-avio', 'dante-console', 'dante-pcie', 'dante-speaker'])
  })

  it('ignore les accents et la casse, et cherche aussi les marques', () => {
    expect(ids('Éclairage')).toEqual(ids('eclairage'))
    expect(ids('eclairage')).toContain('dmx-node')
    expect(ids('advatek')[0]).toBe('pixel-controller')
    expect(normalizeText('Contrôle É')).toBe('controle e')
  })

  it('rend tout le catalogue dans l’ordre pour une requête vide, rien pour du charabia', () => {
    expect(ids('  ')).toEqual(TEMPLATES.map((t) => t.id))
    expect(ids('zzzq')).toEqual([])
  })

  it('trouve l’alimentation et la bande par leurs mots de régie', () => {
    expect(searchTemplates('mean well')[0]?.id).toBe('psu')
    expect(searchTemplates('alim 24v')[0]?.id).toBe('psu')
    expect(searchTemplates('fcob').map((t) => t.id)).toContain('led-strip')
  })
})
