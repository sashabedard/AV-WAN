import { describe, expect, it } from 'vitest'
import { TEMPLATES } from './templates'
import { VLAN_PRESETS } from './vlanPresets'
import type { Localized } from '../../../shared/i18n/localized'

const filled = (l: { fr: string; en: string }): boolean => l.fr.trim() !== '' && l.en.trim() !== ''

describe('catalogue en deux langues', () => {
  it('chaque gabarit a son nom et sa note dans les deux langues', () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(90)
    for (const t of TEMPLATES) {
      expect(filled(t.name as Localized), t.id).toBe(true)
      if (t.note) expect(filled(t.note as Localized), t.id).toBe(true)
    }
  })
  it('chaque VLAN prédéfini a son nom dans les deux langues', () => {
    for (const p of VLAN_PRESETS) expect(filled(p.name), String(p.id)).toBe(true)
  })
})
