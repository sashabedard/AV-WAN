import { describe, expect, it } from 'vitest'
import { fileNameOf } from './fileName'
import { uiStore } from '../store/uiStore'

describe('fileNameOf', () => {
  it('extrait le nom du fichier (macOS et Windows)', () => {
    expect(fileNameOf('/Users/x/lumen.avwan')).toBe('lumen.avwan')
    expect(fileNameOf('C:\\Projets\\lumen.avwan')).toBe('lumen.avwan')
    expect(fileNameOf(null)).toBe('Sans titre')
  })
})

describe('fileNameOf en anglais', () => {
  it('nomme un projet sans fichier « Untitled »', () => {
    uiStore.getState().setLang('en')
    try {
      expect(fileNameOf(null)).toBe('Untitled')
    } finally {
      uiStore.getState().setLang('fr')
    }
  })
})
