import { describe, expect, it } from 'vitest'
import { TEMPLATE_MIME } from '../panels/Palette'
import { isFileDrag } from './useFileDropGuard'

describe('isFileDrag', () => {
  it('reconnaît un fichier glissé depuis le Finder ou l’Explorateur', () => {
    expect(isFileDrag(['Files'])).toBe(true)
    expect(isFileDrag(['text/uri-list', 'Files'])).toBe(true)
  })

  it('laisse passer le glisser de la palette et les glisser sans données', () => {
    expect(isFileDrag([TEMPLATE_MIME])).toBe(false)
    expect(isFileDrag([])).toBe(false)
    expect(isFileDrag(undefined)).toBe(false)
  })
})
