import { describe, expect, it } from 'vitest'
import { safeFileName, withExtension } from './exportPaths'

describe('chemins d’export', () => {
  it('ajoute l’extension seulement si elle manque', () => {
    expect(withExtension('/x/plan', 'pdf')).toBe('/x/plan.pdf')
    expect(withExtension('/x/plan.PDF', 'pdf')).toBe('/x/plan.PDF')
    expect(withExtension('/x/listes', 'xlsx')).toBe('/x/listes.xlsx')
  })

  it('retire du nom proposé les caractères interdits sur macOS ou Windows', () => {
    expect(safeFileName('Régie: A/B *v2*')).toBe('Régie- A-B -v2-')
    expect(safeFileName('   ')).toBe('projet')
  })
})
