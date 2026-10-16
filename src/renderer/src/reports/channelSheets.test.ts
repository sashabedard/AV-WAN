import { describe, expect, it } from 'vitest'
import { channelBlocks } from './channelSheets'
import { createDevice, createProject } from '../model/project'
import type { Device, StoredTemplate, Project } from '../model/types'

const LYRE: StoredTemplate = {
  id: 'custom-lyre000001', category: 'eclairage', name: 'Lyre', code: 'MH', model: 'Lyre test', icon: { kind: 'builtin', name: 'fixture' },
  ports: [{ id: 'DMX-IN', label: 'DMX IN', connector: 'dmx' }],
  dmx: { footprint: 3, modes: [{ name: '3CH', channels: 3, params: ['Dimmer', 'Pan', 'Tilt'] }, { name: '2CH', channels: 2 }] },
  isCustom: true
}

function project(): Project {
  let p: Project = { ...createProject(new Date(2026, 9, 15), 'fr'), templates: [LYRE] }
  const add = (id: string, name: string, dmx: Device['dmx'], extra: Partial<Device> = {}): void => {
    p = { ...p, devices: [...p.devices, { ...createDevice(p, LYRE.id, { x: 0, y: 0 }, { lang: 'fr', id }), name, dmx, ...extra }] }
  }
  add('late', 'MH-9', { footprint: 3, mode: '3CH', address: 1, universe: 2 })
  add('mid', 'MH-2', { footprint: 3, mode: '3CH', address: 19, universe: 1 })
  add('first', 'MH-1', { footprint: 3, mode: '3CH', address: 1, universe: 1 })
  add('free', 'MH-0', { footprint: 3, mode: '3CH' })
  add('nameless', 'MH-5', { footprint: 2, mode: '2CH', address: 40, universe: 1 })
  return p
}

describe('section Canaux DMX', () => {
  it('un bloc par appareil nommé, adresses réelles, ordre univers › adresse ; non patchés à la fin', () => {
    const blocks = channelBlocks(project(), 'fr')
    expect(blocks.map((b) => b.title)).toEqual(['MH-1 · U1 · 1–3', 'MH-2 · U1 · 19–21', 'MH-9 · U2 · 1–3', 'MH-0 · non patché'])
    expect(blocks[1]!.subtitle).toBe('Lyre test · 3CH')
    expect(blocks[1]!.rows).toEqual([[19, 1, 'Dimmer'], [20, 2, 'Pan'], [21, 3, 'Tilt']])
    expect(blocks[3]!.rows[0]).toEqual([null, 1, 'Dimmer'])
  })

  it('univers inconnu : U? ; canaux coupés au nombre de canaux ; trous gardés', () => {
    let p = project()
    p = { ...p, devices: p.devices.map((d) => (d.id === 'mid' ? { ...d, dmx: { footprint: 2, mode: '3CH', address: 19 } } : d)) }
    p = { ...p, dmxChannels: [{ templateId: LYRE.id, model: 'Lyre test', mode: '2CH', params: ['', 'Pan'] }] }
    const blocks = channelBlocks(p, 'fr')
    const mid = blocks.find((b) => b.deviceId === 'mid')!
    expect(mid.title).toBe('MH-2 · U? · 19–20')
    expect(mid.rows).toEqual([[19, 1, 'Dimmer'], [20, 2, 'Pan']])
    expect(blocks.find((b) => b.deviceId === 'nameless')!.rows).toEqual([[40, 1, ''], [41, 2, 'Pan']])
  })

  it('rien de nommé : aucun bloc ; les réglages comptent quand on les donne', () => {
    const p = project()
    expect(channelBlocks(p, 'fr').some((b) => b.deviceId === 'nameless')).toBe(false)
    const settings = [{ templateId: LYRE.id, model: 'Lyre test', mode: '2CH', params: ['Dim'] }]
    expect(channelBlocks(p, 'fr', settings).find((b) => b.deviceId === 'nameless')!.rows[0]).toEqual([40, 1, 'Dim'])
  })

  it('gabarit intégré sans modèle : le sous-titre est son nom français', () => {
    let p: Project = createProject(new Date(2026, 9, 15), 'fr')
    p = { ...p, devices: [{ ...createDevice(p, 'moving-spot', { x: 0, y: 0 }, { lang: 'fr', id: 'ms' }), dmx: { footprint: 2, mode: 'X', address: 1, universe: 1 } }] }
    p = { ...p, dmxChannels: [{ templateId: 'moving-spot', model: '', mode: 'X', params: ['Pan', 'Tilt'] }] }
    expect(channelBlocks(p, 'fr')[0]!.subtitle).toBe('Lyre spot · X')
  })
})
