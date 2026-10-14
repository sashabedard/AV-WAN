import { describe, expect, it } from 'vitest'
import { APP_NAME, APP_SUBTITLE, FILE_EXTENSION } from './appInfo'

describe('appInfo', () => {
  it('expose le nom, le sous-titre et une extension ASCII', () => {
    expect(APP_NAME).toBe('AV·WAN')
    expect(APP_SUBTITLE).toBe('Audio-Vidéo · Wiring, Addressing, Networking')
    expect(FILE_EXTENSION).toBe('avwan')
  })
})
