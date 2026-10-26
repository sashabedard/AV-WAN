import { describe, expect, it } from 'vitest'
import { WHATS_NEW_KEY, takeWhatsNew } from './whatsNewSeen'

const memory = (init: Record<string, string> = {}) => {
  const data = { ...init }
  return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) }
}

describe('takeWhatsNew', () => {
  it('une fois par nouvelle version : au premier lancement, puis plus jamais pour cette version', () => {
    const s = memory()
    expect(takeWhatsNew('1.5.0', s, false)).toBe(true)
    expect(s.data[WHATS_NEW_KEY]).toBe('1.5.0')
    expect(takeWhatsNew('1.5.0', s, false)).toBe(false)
    expect(takeWhatsNew('1.5.1', s, false)).toBe(true)
  })

  it('une personne qui arrive de la 1.4 (rien de mémorisé) le voit', () => {
    expect(takeWhatsNew('1.5.0', memory({ 'avwan.theme': 'dark' }), false)).toBe(true)
  })

  it('jamais pendant les tests e2e ; jamais si le stockage est inaccessible', () => {
    expect(takeWhatsNew('1.5.0', memory(), true)).toBe(false)
    const broken = { getItem: () => { throw new Error('bloqué') }, setItem: () => { throw new Error('bloqué') } }
    expect(takeWhatsNew('1.5.0', broken, false)).toBe(false)
    expect(takeWhatsNew('1.5.0', null, false)).toBe(false)
  })
})
