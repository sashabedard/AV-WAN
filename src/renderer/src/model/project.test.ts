import { describe, expect, it } from 'vitest'
import { createDevice, createProject } from './project'
import { ProjectSchema } from './schema'

describe('createProject', () => {
  it('crée un projet valide avec les 5 VLAN par défaut', () => {
    const p = createProject(new Date('2026-10-13T15:00:00Z'))
    expect(ProjectSchema.safeParse(p).success).toBe(true)
    expect(p.vlans.map((v) => v.id)).toEqual([10, 20, 30, 40, 60])
    expect(p.meta.date).toBe('2026-10-13')
    expect(p.settings).toEqual({ colorMode: 'vlan', pageFormat: 'na', cableIdPrefix: 'C-', snapToGrid: true })
  })
})

describe('createDevice', () => {
  it('nomme les appareils par code, sans doublon', () => {
    let p = createProject()
    const a = createDevice(p, 'ptz-ndi', { x: 0, y: 0 })
    p = { ...p, devices: [a] }
    const b = createDevice(p, 'ip-camera', { x: 0, y: 0 })
    expect([a.name, b.name]).toEqual(['CAM-1', 'CAM-2'])
    expect(a.portSide).toBe('auto')
    expect(a.ports.map((x) => x.id)).toEqual(['ETH', 'HDMI', 'SDI'])
  })

  it('génère les ports et le budget par défaut pour un switch', () => {
    const d = createDevice(createProject(), 'switch', { x: 8, y: 16 }, { switchSpec: { portCount: 24, poe: 'at', sfpPlus: 4, managed: true } })
    expect(d.ports).toHaveLength(28)
    expect(d.switch).toEqual({ portCount: 24, poe: 'at', poeBudgetW: 400, sfpPlus: 4, managed: true })
    expect(d.position).toEqual({ x: 8, y: 16 })
  })

  it('refuse un gabarit inconnu', () => {
    expect(() => createDevice(createProject(), 'nope', { x: 0, y: 0 })).toThrow('Gabarit inconnu')
  })
})
