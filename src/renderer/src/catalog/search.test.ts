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

  it('trouve les génériques d’éclairage comme on en parle en régie', () => {
    expect(searchTemplates('lyre spot')[0]?.id).toBe('moving-spot')
    expect(searchTemplates('haze')[0]?.id).toBe('hazer')
    expect(searchTemplates('strobe')[0]?.id).toBe('strobe')
  })

  it('trouve un capteur par sa marque ou son modèle', () => {
    expect(searchTemplates('livox')[0]?.id).toBe('livox-mid-360')
    expect(searchTemplates('mid-360')[0]?.id).toBe('livox-mid-360')
    expect(searchTemplates('femto mega')[0]?.id).toBe('orbbec-femto-mega')
    expect(searchTemplates('kinect').map((t) => t.id)).toEqual(expect.arrayContaining(['kinect-v1', 'kinect-v2', 'azure-kinect-dk']))
  })

  it('trouve l’éclairage nommé', () => {
    expect(searchTemplates('sharpy')[0]?.id).toBe('claypaky-sharpy')
    expect(searchTemplates('megapointe')[0]?.id).toBe('robe-megapointe')
    expect(searchTemplates('pixlite t8')[0]?.id).toBe('advatek-pixlite-t8s-mk3')
  })

  it('trouve la vidéo nommée', () => {
    expect(ids('tessera')).toEqual(expect.arrayContaining(['brompton-tessera-sx40', 'brompton-tessera-xd-10g']))
    expect(searchTemplates('atem')[0]?.id).toBe('bmd-atem-mini-pro')
  })

  it('trouve l’audio et les contrôleurs nommés', () => {
    expect(searchTemplates('rio1608')[0]?.id).toBe('yamaha-rio1608-d2')
    expect(searchTemplates('stream deck')[0]?.id).toBe('elgato-stream-deck-mk2')
  })

  it('« alimentation » donne l’alimentation, pas l’injecteur PoE ; ULX-D et vx4 comme on les écrit', () => {
    expect(searchTemplates('alimentation')[0]?.id).toBe('psu')
    expect(searchTemplates('injecteur')[0]?.id).toBe('poe-injector')
    expect(searchTemplates('midspan')[0]?.id).toBe('poe-injector')
    expect(searchTemplates('ulx-d')[0]?.id).toBe('shure-ulxd4d')
    expect(searchTemplates('ulxd')[0]?.id).toBe('shure-ulxd4d')
    expect(searchTemplates('vx4')[0]?.id).toBe('disguise-vx-4')
  })

  it('trouve un appareil par son nom ou un synonyme, dans les deux langues', () => {
    // Au-delà des vraies correspondances, la recherche approximative (lettres dans l'ordre) ajoute du bruit propre à chaque requête.
    expect(ids('lyre').slice(0, 3)).toEqual(['moving-spot', 'moving-wash', 'moving-beam'])
    expect(ids('moving head').slice(0, 3)).toEqual(ids('lyre').slice(0, 3))
    expect(ids('éclairage').length).toBeGreaterThan(0)
    expect(ids('lighting').length).toBeGreaterThan(0)
  })
})
