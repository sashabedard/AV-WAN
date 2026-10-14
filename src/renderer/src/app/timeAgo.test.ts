import { describe, expect, it } from 'vitest'
import { timeAgo } from './timeAgo'

const NOW = Date.parse('2026-10-14T12:00:00.000Z')
const ago = (ms: number): string => timeAgo(new Date(NOW - ms).toISOString(), NOW)

describe('timeAgo', () => {
  it('dit le temps écoulé en français, arrondi', () => {
    expect(ago(20_000)).toBe('il y a quelques secondes')
    expect(ago(3 * 60_000)).toBe('il y a 3 min')
    expect(ago(59 * 60_000 + 40_000)).toBe('il y a 1 h')
    expect(ago(5 * 3_600_000)).toBe('il y a 5 h')
    expect(ago(3 * 86_400_000)).toBe('il y a 3 j')
  })

  it('une date dans le futur compte comme « quelques secondes »', () => {
    expect(ago(-60_000)).toBe('il y a quelques secondes')
  })
})
