import { describe, expect, it } from 'vitest'
import { setMainLang } from './lang'
import { csvPaths, exportFilters, existingPaths, safeFileName, withExtension } from './exportPaths'

describe('chemins d’export', () => {
  it('place les trois CSV à côté du nom choisi', () => {
    expect(csvPaths('/x/lumen.csv', ['branchement', 'plan-ip', 'nomenclature'])).toEqual([
      '/x/lumen-branchement.csv',
      '/x/lumen-plan-ip.csv',
      '/x/lumen-nomenclature.csv'
    ])
    expect(csvPaths('/x/lumen.CSV', ['plan-ip'])).toEqual(['/x/lumen-plan-ip.csv'])
  })

  it('ajoute l’extension seulement si elle manque', () => {
    expect(withExtension('/x/plan', 'pdf')).toBe('/x/plan.pdf')
    expect(withExtension('/x/plan.PDF', 'pdf')).toBe('/x/plan.PDF')
    expect(withExtension('/x/listes', 'xlsx')).toBe('/x/listes.xlsx')
  })

  it('retire du nom proposé les caractères interdits sur macOS ou Windows', () => {
    expect(safeFileName('Régie: A/B *v2*')).toBe('Régie- A-B -v2-')
    expect(safeFileName('   ')).toBe('projet')
  })

  it('retire les caractères de contrôle', () => {
    expect(safeFileName('a\u0000b\nc\u007fd')).toBe('a-b-c-d')
  })

  it('évite les noms réservés de Windows', () => {
    expect(safeFileName('CON')).toBe('CON-projet')
    expect(safeFileName('nul.txt')).toBe('nul.txt-projet')
    expect(safeFileName('Lpt9')).toBe('Lpt9-projet')
    expect(safeFileName('console')).toBe('console')
    expect(safeFileName('COM10')).toBe('COM10')
  })

  it('liste les chemins qui existent déjà', () => {
    const present = new Set(['/x/a-plan-ip.csv'])
    expect(existingPaths(['/x/a-branchement.csv', '/x/a-plan-ip.csv'], (p) => present.has(p))).toEqual(['/x/a-plan-ip.csv'])
    expect(existingPaths(['/x/zzz-inexistant.csv'])).toEqual([])
  })
})

describe('filtres d’export', () => {
  it('se disent dans la langue du main', () => {
    expect(exportFilters().csv.name).toBe('Fichiers CSV')
    setMainLang('en')
    try {
      expect(exportFilters().csv.name).toBe('CSV files')
      expect(exportFilters().csv.extensions).toEqual(['csv'])
      expect(safeFileName('   ')).toBe('project')
    } finally {
      setMainLang('fr')
    }
  })
})
