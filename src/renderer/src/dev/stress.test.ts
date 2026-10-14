import { describe, expect, it } from 'vitest'
import { makeStressProject } from './stress'
import { ProjectSchema } from '../model/schema'
import { sanitizeProject } from '../model/sanitize'

describe('makeStressProject', () => {
  it('produit 150 appareils et 400 câbles valides, sans port doublé', () => {
    const p = makeStressProject()
    expect(p.devices).toHaveLength(150)
    expect(p.links).toHaveLength(400)
    expect(ProjectSchema.safeParse(p).success).toBe(true)
    expect(sanitizeProject(p).warnings).toEqual([])
  })
})
