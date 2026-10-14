import { describe, expect, it } from 'vitest'
import { fileNameOf } from './fileName'

describe('fileNameOf', () => {
  it('extrait le nom du fichier (macOS et Windows)', () => {
    expect(fileNameOf('/Users/x/lumen.avwan')).toBe('lumen.avwan')
    expect(fileNameOf('C:\\Projets\\lumen.avwan')).toBe('lumen.avwan')
    expect(fileNameOf(null)).toBe('Sans titre')
  })
})
