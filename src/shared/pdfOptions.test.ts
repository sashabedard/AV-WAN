import { describe, expect, it } from 'vitest'
import { defaultPdfOptions, normalizePdfOptions } from './pdfOptions'

describe('options du PDF', () => {
  it('coche toutes les sections par défaut sauf les élévations câblées, dans l’ordre de la spec', () => {
    expect(defaultPdfOptions()).toEqual({
      sections: ['schema', 'appareils', 'ports', 'branchement', 'vlans', 'ip', 'patch', 'canaux', 'puissance', 'nomenclature', 'baies'],
      format: 'na',
      zonePages: true,
      lang: 'fr'
    })
    expect(defaultPdfOptions('iso').format).toBe('iso')
  })

  it('garde les deux sections de baie reçues par IPC, à la fin', () => {
    expect(normalizePdfOptions({ sections: ['baies-cables', 'schema', 'baies', 'x'] }).sections).toEqual(['schema', 'baies', 'baies-cables'])
  })

  it('ne garde que les sections connues, une fois chacune, dans l’ordre d’impression', () => {
    expect(normalizePdfOptions({ sections: ['ip', 'schema', 'inconnue', 'ip'], format: 'iso', zonePages: true })).toEqual({
      sections: ['schema', 'ip'],
      format: 'iso',
      zonePages: true,
      lang: 'fr'
    })
  })

  it('remplace une valeur douteuse par la valeur sûre', () => {
    expect(normalizePdfOptions(null)).toEqual({ sections: [], format: 'na', zonePages: false, lang: 'fr' })
    expect(normalizePdfOptions({ sections: 'schema', format: 'A0', zonePages: 'oui' })).toEqual({ sections: [], format: 'na', zonePages: false, lang: 'fr' })
  })
})

describe('langue des documents', () => {
  it('garde la langue des documents, français par défaut', () => {
    expect(normalizePdfOptions({ sections: ['schema'], format: 'na', zonePages: true, lang: 'en' }).lang).toBe('en')
    expect(normalizePdfOptions({ sections: ['schema'], format: 'na', zonePages: true }).lang).toBe('fr')
    expect(normalizePdfOptions({ lang: 'de' }).lang).toBe('fr')
    expect(defaultPdfOptions('na', 'en').lang).toBe('en')
  })
})
