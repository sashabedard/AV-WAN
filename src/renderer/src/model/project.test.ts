import { describe, expect, it } from 'vitest'
import { createDevice, createProject } from './project'
import { ProjectSchema } from './schema'
import type { StoredTemplate } from './types'

describe('createProject', () => {
  it('crée un projet valide avec les 5 VLAN par défaut', () => {
    const p = createProject(new Date(2026, 9, 13, 15, 0), 'fr')
    expect(ProjectSchema.safeParse(p).success).toBe(true)
    expect(p.vlans.map((v) => v.id)).toEqual([10, 20, 30, 40, 60])
    expect(p.meta.date).toBe('2026-10-13')
    expect(p.settings).toEqual({ colorMode: 'vlan', pageFormat: 'na', cableIdPrefix: 'C-', snapToGrid: true })
  })

  it('date le projet au jour local, même tard le soir ou tôt le matin', () => {
    expect(createProject(new Date(2026, 9, 13, 23, 30), 'fr').meta.date).toBe('2026-10-13')
    expect(createProject(new Date(2026, 9, 13, 0, 30), 'fr').meta.date).toBe('2026-10-13')
    expect(createProject(new Date(2026, 0, 5, 23, 59), 'fr').meta.date).toBe('2026-01-05')
  })
})

describe('createDevice', () => {
  it('nomme les appareils par code, sans doublon', () => {
    let p = createProject(undefined, 'fr')
    const a = createDevice(p, 'ptz-ndi', { x: 0, y: 0 }, { lang: 'fr' })
    p = { ...p, devices: [a] }
    const b = createDevice(p, 'ip-camera', { x: 0, y: 0 }, { lang: 'fr' })
    expect([a.name, b.name]).toEqual(['CAM-1', 'CAM-2'])
    expect(a.portSide).toBe('auto')
    expect(a.ports.map((x) => x.id)).toEqual(['ETH', 'HDMI', 'SDI'])
  })

  it('génère les ports et le budget par défaut pour un switch', () => {
    const d = createDevice(createProject(undefined, 'fr'), 'switch', { x: 8, y: 16 }, { lang: 'fr', switchSpec: { portCount: 24, poe: 'at', sfpPlus: 4, managed: true } })
    expect(d.ports).toHaveLength(28)
    expect(d.switch).toEqual({ portCount: 24, poe: 'at', poeBudgetW: 400, sfpPlus: 4, managed: true })
    expect(d.position).toEqual({ x: 8, y: 16 })
  })

  it('refuse un gabarit inconnu', () => {
    expect(() => createDevice(createProject(undefined, 'fr'), 'nope', { x: 0, y: 0 }, { lang: 'fr' })).toThrow('Gabarit inconnu')
  })
})

it('copie puissance, patch (1er mode), note, alimentation et bande du gabarit', () => {
  const t: StoredTemplate = {
    id: 'custom-lyre000001', category: 'eclairage', name: 'Lyre', code: 'MH', icon: { kind: 'builtin', name: 'fixture' }, ports: [],
    powerW: 470, note: 'Lire la fiche.', dmx: { footprint: 16, modes: [{ name: 'Standard', channels: 31 }, { name: 'Basic', channels: 16 }] },
    isCustom: true
  }
  const p = { ...createProject(new Date(2026, 9, 14), 'fr'), templates: [t] }
  expect(createDevice(p, t.id, { x: 0, y: 0 }, { lang: 'fr' })).toMatchObject({ powerW: 470, note: 'Lire la fiche.', dmx: { footprint: 31, mode: 'Standard' } })
})

it('l’« Appareil DMX » intégré est patchable avec 1 canal, sans adresse', () => {
  expect(createDevice(createProject(undefined, 'fr'), 'dmx-fixture', { x: 0, y: 0 }, { lang: 'fr' }).dmx).toEqual({ footprint: 1 })
})

it('ne partage pas l’objet du gabarit (alimentation, bande)', () => {
  const t: StoredTemplate = { id: 'custom-alim000001', category: 'autre', name: 'Alim', code: 'PSU', icon: { kind: 'builtin', name: 'generic' }, ports: [], psu: { volts: 24 }, isCustom: true }
  const p = { ...createProject(undefined, 'fr'), templates: [t] }
  const d = createDevice(p, t.id, { x: 0, y: 0 }, { lang: 'fr' })
  expect(d.psu).toEqual({ volts: 24 })
  expect(d.psu).not.toBe(t.psu)
})

describe('création dans la langue (plan 6)', () => {
  it('createProject(now, "en") : titre et VLAN en anglais', () => {
    const p = createProject(new Date(2026, 9, 13), 'en')
    expect(p.meta.title).toBe('New project')
    expect(p.vlans.map((v) => v.name)).toContain('Management')
    expect(p.vlans.map((v) => v.name)).toContain('Dante A')
    expect(createProject(new Date(2026, 9, 13), 'fr').meta.title).toBe('Nouveau projet')
  })
  it('createDevice(…, { lang: "en" }) : étiquette de port en anglais', () => {
    const p = createProject(new Date(2026, 9, 13), 'en')
    expect(createDevice(p, 'dante-pcie', { x: 0, y: 0 }, { lang: 'en' }).ports[0]!.label).toBe('Primary')
    expect(createDevice(p, 'dante-pcie', { x: 0, y: 0 }, { lang: 'fr' }).ports[0]!.label).toBe('Primaire')
  })
})
