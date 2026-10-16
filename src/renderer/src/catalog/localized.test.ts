import { describe, expect, it } from 'vitest'
import { TEMPLATES } from './templates'
import { VLAN_PRESETS } from './vlanPresets'
import type { Localized } from '../../../shared/i18n/localized'

const filled = (l: { fr: string; en: string }): boolean => l.fr.trim() !== '' && l.en.trim() !== ''

describe('catalogue en deux langues', () => {
  it('chaque gabarit a son nom et sa note dans les deux langues', () => {
    // Les modèles nommés gardent des chaînes simples jusqu'à la Task 10 : on vérifie les gabarits déjà bilingues.
    const bilingual = TEMPLATES.filter((t) => typeof t.name !== 'string')
    expect(bilingual.length).toBeGreaterThanOrEqual(50)
    for (const t of bilingual) {
      expect(filled(t.name as Localized), t.id).toBe(true)
      if (t.note) expect(filled(t.note as Localized), t.id).toBe(true)
    }
  })
  it('chaque VLAN prédéfini a son nom dans les deux langues', () => {
    for (const p of VLAN_PRESETS) expect(filled(p.name), String(p.id)).toBe(true)
  })
})
