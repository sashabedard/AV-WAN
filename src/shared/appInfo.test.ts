import { describe, expect, it } from 'vitest'
import { APP_NAME, FILE_EXTENSION } from './appInfo'
import { messages } from './i18n/messages'

describe('appInfo', () => {
  it('expose le nom, le sous-titre et une extension ASCII', () => {
    expect(APP_NAME).toBe('AV·WAN')
    expect(messages('fr').common.appSubtitle).toBe('Audio-Vidéo · Wiring, Addressing, Networking')
    expect(messages('en').common.appSubtitle).toBe('Audio-Video · Wiring, Addressing, Networking')
    expect(FILE_EXTENSION).toBe('avwan')
  })
})
