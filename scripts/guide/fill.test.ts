import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { fillGuide } = require('./fill.cjs') as { fillGuide: (html: string, values: Record<string, string>) => string }

describe('fillGuide', () => {
  it('remplace chaque balise par sa valeur', () => {
    expect(fillGuide('v{{VERSION}} — {{RELEASES_URL}}', { VERSION: '1.0.0', RELEASES_URL: 'https://x/releases' })).toBe('v1.0.0 — https://x/releases')
  })

  it('refuse une balise sans valeur', () => {
    expect(() => fillGuide('{{VERSION}} {{AUTRE}}', { VERSION: '1.0.0' })).toThrow('Valeur manquante pour {{AUTRE}}')
  })
})
