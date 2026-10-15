import { describe, expect, it } from 'vitest'
import { DeviceSchema, DeviceTemplateSchema, IconRefSchema, PortStateSchema, ProjectSchema } from './schema'
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

describe('schéma v2 : patch, puissance, bandes', () => {
  const device = { id: 'f', templateId: 'dmx-fixture', name: 'FIX-1', position: { x: 0, y: 0 }, portSide: 'auto', ports: [], portState: {} }

  it('accepte un appareil patché, alimenté, une alimentation et une bande', () => {
    expect(DeviceSchema.safeParse({ ...device, powerW: 470, dmx: { footprint: 16, address: 33, universe: 0, mode: 'Standard' } }).success).toBe(true)
    expect(DeviceSchema.safeParse({ ...device, psu: { volts: 24, amps: 15 } }).success).toBe(true)
    expect(DeviceSchema.safeParse({ ...device, ledStrip: { type: 'sk6812-rgbw', volts: 24, wPerM: 14.4, lengthM: 5, pxPerM: 60 } }).success).toBe(true)
    expect(DeviceSchema.safeParse({ ...device, ledStrip: { type: 'cob', volts: 24, wPerM: 10 } }).success).toBe(true)
  })

  it('refuse une adresse, des canaux ou un univers hors bornes', () => {
    for (const dmx of [{ footprint: 0 }, { footprint: 513 }, { footprint: 1, address: 0 }, { footprint: 1, address: 513 }, { footprint: 1, universe: -1 }, { footprint: 1, universe: 64000 }, { footprint: 1.5 }]) {
      expect(DeviceSchema.safeParse({ ...device, dmx }).success, JSON.stringify(dmx)).toBe(false)
    }
    expect(PortStateSchema.safeParse({ universe: 63999 }).success).toBe(true)
    expect(PortStateSchema.safeParse({ universe: 64000 }).success).toBe(false)
  })

  it('accepte des modes DMX et une note sur un gabarit', () => {
    const t = { id: 'x', category: 'eclairage', name: 'Lyre', code: 'MH', icon: { kind: 'builtin', name: 'fixture' }, ports: [], note: 'n', powerW: 470, dmx: { footprint: 31, modes: [{ name: 'Standard', channels: 31 }] } }
    expect(DeviceTemplateSchema.safeParse(t).success).toBe(true)
    expect(DeviceTemplateSchema.safeParse({ ...t, dmx: { footprint: 31, modes: [] } }).success).toBe(false)
  })

  it('accepte une tension secteur de 120 ou 230 V seulement', () => {
    const p = sampleProject()
    expect(ProjectSchema.safeParse({ ...p, settings: { ...p.settings, mainsVoltage: 230 } }).success).toBe(true)
    expect(ProjectSchema.safeParse({ ...p, settings: { ...p.settings, mainsVoltage: 110 } }).success).toBe(false)
  })

  it('accepte la prise et le câble « Alim DC »', () => {
    expect(DeviceSchema.safeParse({ ...device, ports: [{ id: 'DC-IN', label: 'DC IN', connector: 'dc' }] }).success).toBe(true)
  })
})
