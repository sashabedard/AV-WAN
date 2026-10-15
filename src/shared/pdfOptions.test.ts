import { describe, expect, it } from 'vitest'
import { defaultPdfOptions, normalizePdfOptions } from './pdfOptions'

describe('options du PDF', () => {
  it('coche toutes les sections par défaut, dans l’ordre de la spec', () => {
    expect(defaultPdfOptions()).toEqual({
      sections: ['schema', 'appareils', 'ports', 'branchement', 'vlans', 'ip', 'patch', 'nomenclature'],
      format: 'na',
      zonePages: true
    })
    expect(defaultPdfOptions('iso').format).toBe('iso')
  })

  it('ne garde que les sections connues, une fois chacune, dans l’ordre d’impression', () => {
    expect(normalizePdfOptions({ sections: ['ip', 'schema', 'inconnue', 'ip'], format: 'iso', zonePages: true })).toEqual({
      sections: ['schema', 'ip'],
      format: 'iso',
      zonePages: true
    })
  })

  it('remplace une valeur douteuse par la valeur sûre', () => {
    expect(normalizePdfOptions(null)).toEqual({ sections: [], format: 'na', zonePages: false })
    expect(normalizePdfOptions({ sections: 'schema', format: 'A0', zonePages: 'oui' })).toEqual({ sections: [], format: 'na', zonePages: false })
  })
})
