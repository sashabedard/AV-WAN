import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
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

describe('guide d’installation livré', () => {
  const html = readFileSync(new URL('../../build/guide/installation.html', import.meta.url), 'utf8')

  it('n’utilise que les balises que le script de rendu remplit', () => {
    expect(() => fillGuide(html, { VERSION: '1.0.0', RELEASES_URL: 'https://x/releases', FONT_DIR: 'file:///f' })).not.toThrow()
  })

  it('décrit l’enregistrement automatique dans le fichier, le dossier par défaut et le retour à la version d’ouverture', () => {
    expect(html).toContain('<strong>Fichier › Enregistrement automatique</strong>')
    expect(html).toContain('actif par défaut')
    expect(html).toContain('<strong>Documents › AV·WAN</strong>')
    expect(html).toContain('<strong>Fichier › Revenir à la version d’ouverture…</strong>')
    // Apostrophes typographiques, comme le reste du guide.
    expect(html).not.toMatch(/[A-Za-zÀ-ÿ]'[A-Za-zÀ-ÿ]/)
  })
})
