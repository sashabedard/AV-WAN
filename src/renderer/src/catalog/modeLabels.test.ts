import { describe, expect, it } from 'vitest'
import { modeLabel } from './modeLabels'
import { LIGHTING_MODELS } from './models/eclairage'

describe('modeLabel', () => {
  it('traduit l’affichage d’un mode connu sans toucher la clé', () => {
    expect(modeLabel('Étendu (EXT)', 'en')).toBe('Extended (EXT)')
    expect(modeLabel('Étendu (EXT)', 'fr')).toBe('Étendu (EXT)')
    expect(modeLabel('5 canaux', 'en')).toBe('5 channels')
  })
  it('renvoie tel quel un mode inconnu (tapé par la personne, ou déjà anglais)', () => {
    expect(modeLabel('16CH', 'en')).toBe('16CH')
    expect(modeLabel('Mon mode', 'en')).toBe('Mon mode')
  })
  it('chaque mode français du catalogue a sa traduction', () => {
    const names = LIGHTING_MODELS.flatMap((t) => t.dmx?.modes?.map((md) => md.name) ?? [])
    const french = names.filter((n) => /[ÉéèêàçÉ]|canau?x?\b|Pompe|^Mode \d/.test(n))
    expect(french.length).toBeGreaterThan(5)
    for (const n of french) expect(modeLabel(n, 'en'), n).not.toBe(n)
  })
})
