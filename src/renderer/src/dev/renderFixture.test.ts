import { describe, expect, it } from 'vitest'
import { makeRenderFixture } from './renderFixture'
import { ProjectSchema } from '../model/schema'
import { sanitizeProject } from '../model/sanitize'
import { linkVlanView } from '../model/derive'

describe('makeRenderFixture', () => {
  const p = makeRenderFixture()

  it('est un projet valide que l’ouverture ne modifie pas', () => {
    expect(ProjectSchema.safeParse(p).success).toBe(true)
    expect(sanitizeProject(p).warnings).toEqual([])
  })

  it('montre les trois façades, une tuile et un cordon de chaque sorte', () => {
    expect(p.devices.filter((d) => d.switch).map((d) => d.switch!.portCount)).toEqual([8, 24, 48])
    expect(p.links.map((l) => l.medium)).toEqual(['cat6', 'om4', 'dac', 'cat6', 'wifi', 'pixel'])
    expect(linkVlanView(p, p.links[1]!)).toEqual({ kind: 'trunk', native: 10, tagged: [10, 20, 30, 40] })
  })
})
