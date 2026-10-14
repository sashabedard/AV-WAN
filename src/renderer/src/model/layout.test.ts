import { describe, expect, it } from 'vitest'
import { resolvePortSide } from './layout'
import { sampleProject } from './__fixtures__/sample'

describe('resolvePortSide', () => {
  it("met les prises face aux appareils branchés (la caméra est sous le switch)", () => {
    const p = sampleProject()
    expect(resolvePortSide(p, p.devices[1]!)).toBe('top')
    expect(resolvePortSide(p, p.devices[0]!)).toBe('bottom')
  })

  it('respecte un choix manuel et met les prises en bas sans câble', () => {
    const p = sampleProject()
    expect(resolvePortSide(p, { ...p.devices[1]!, portSide: 'left' })).toBe('left')
    expect(resolvePortSide({ ...p, links: [] }, p.devices[1]!)).toBe('bottom')
  })

  it('choisit un côté latéral quand le voisin est surtout à droite', () => {
    const p = sampleProject()
    p.devices[1]!.position = { x: 600, y: 40 }
    expect(resolvePortSide(p, p.devices[0]!)).toBe('right')
  })
})
