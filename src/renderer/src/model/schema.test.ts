import { describe, expect, it } from 'vitest'
import { IconRefSchema, ProjectSchema } from './schema'
import { sampleProject } from './__fixtures__/sample'

describe('ProjectSchema', () => {
  it('accepte un projet valide', () => {
    expect(ProjectSchema.safeParse(sampleProject()).success).toBe(true)
  })

  it('refuse un VLAN hors 1..4094', () => {
    const p = sampleProject()
    p.vlans[0]!.id = 5000
    expect(ProjectSchema.safeParse(p).success).toBe(false)
  })

  it('refuse un identifiant de port contenant une espace', () => {
    const p = sampleProject()
    p.devices[0]!.ports[0]!.id = 'DMX A'
    expect(ProjectSchema.safeParse(p).success).toBe(false)
  })

  it("refuse une icône image qui n'est pas une data URI d'image", () => {
    const p = sampleProject()
    p.devices[1]!.icon = { kind: 'image', dataUri: 'https://exemple.com/x.png' }
    expect(ProjectSchema.safeParse(p).success).toBe(false)
  })

  it('conserve les accents et les chaînes vides', () => {
    const p = sampleProject()
    p.devices[0]!.name = 'RÉGIE-É'
    p.meta.title = ''
    const r = ProjectSchema.parse(p)
    expect(r.devices[0]!.name).toBe('RÉGIE-É')
    expect(r.meta.title).toBe('')
  })
})

describe('IconRefSchema', () => {
  it('garde la teinte d’une icône importée, facultative', () => {
    expect(IconRefSchema.parse({ kind: 'image', dataUri: 'data:image/svg+xml;base64,AA==', tint: true })).toEqual({ kind: 'image', dataUri: 'data:image/svg+xml;base64,AA==', tint: true })
    expect(IconRefSchema.parse({ kind: 'image', dataUri: 'data:image/png;base64,AA==' })).toEqual({ kind: 'image', dataUri: 'data:image/png;base64,AA==' })
  })
})
