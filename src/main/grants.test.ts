import { describe, expect, it } from 'vitest'
import { assertRecentMember, createGrants } from './grants'

describe('chemins accordés', () => {
  it('refuse un chemin non accordé, accepte un chemin accordé', () => {
    const g = createGrants()
    expect(g.isGranted('/a/x.avwan')).toBe(false)
    expect(() => g.assertGranted('/a/x.avwan')).toThrow(/dialogue/)
    g.grant('/a/x.avwan')
    expect(g.isGranted('/a/x.avwan')).toBe(true)
    expect(() => g.assertGranted('/a/x.avwan')).not.toThrow()
  })

  it('compare la chaîne exacte, sans normalisation', () => {
    const g = createGrants()
    g.grant('/a/x.avwan')
    for (const other of ['/a/./x.avwan', '/a/../a/x.avwan', '/a/x.avwan/', '/A/x.avwan', '/a//x.avwan']) {
      expect(g.isGranted(other)).toBe(false)
    }
  })

  it('recent:open refuse un chemin hors de la liste', () => {
    expect(() => assertRecentMember(['/a.avwan'], '/b.avwan')).toThrow(/récents/)
    expect(() => assertRecentMember(['/a.avwan'], '/a.avwan')).not.toThrow()
  })
})
