import { describe, expect, it } from 'vitest'
import type { Device, PortDef, Project } from './types'
import { createProject } from './project'
import { resolvePortSides, sideGroupOf, sideLayout } from './sides'

const ports = (prefix: string, connector: PortDef['connector'], n: number): PortDef[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i + 1}`, label: `${prefix} ${i + 1}`, connector }))
const server = (over: Partial<Device> = {}): Device => ({
  id: 'srv',
  templateId: 'media-server',
  name: 'SRV-1',
  position: { x: 0, y: 0 },
  portSide: 'auto',
  // ordre volontairement mélangé : le rangement suit les groupes, puis l'ordre des ports
  ports: [...ports('USB', 'usb', 2), ...ports('ETH', 'rj45', 2), ...ports('DP', 'displayport', 8), ...ports('USB', 'usb', 4).slice(2), { id: 'DC', label: 'DC', connector: 'dc' }],
  portState: {},
  ...over
})
const peer = (id: string, x: number, y: number, connector: PortDef['connector']): Device => ({
  id, templateId: 'display', name: id, position: { x, y }, portSide: 'auto', ports: [{ id: 'IN', label: 'IN', connector }], portState: {}
})
const project = (devices: Device[], links: Project['links'] = []): Project => ({ ...createProject(undefined, 'fr'), devices, links })

describe('sides', () => {
  it('sideGroupOf', () => {
    expect((['rj45', 'sfp', 'sfp+', 'wifi', 'hdmi', 'sdi', 'displayport', 'usb', 'serial', 'dc', 'dmx', 'pixel'] as const).map(sideGroupOf)).toEqual([
      'reseau', 'reseau', 'reseau', 'reseau', 'video', 'video', 'video', 'usb', 'usb', 'alim', 'dmx', 'dmx'
    ])
  })

  it('côtés réglés : 2 / 8 / 4 / 1 ports à gauche / droite / haut / bas', () => {
    const d = server({ portSides: { reseau: 'left', video: 'right', usb: 'top', alim: 'bottom' } })
    const layout = sideLayout(d, resolvePortSides(project([d]), d))
    expect([layout.left.length, layout.right.length, layout.top.length, layout.bottom.length]).toEqual([2, 8, 4, 1])
    expect(layout.top.map((p) => p.id)).toEqual(['USB1', 'USB2', 'USB3', 'USB4'])
  })

  it('un côté par défaut regroupe par type, puis dans l’ordre des ports', () => {
    const d = server({ portSide: 'bottom', portSides: { video: 'right' } })
    const layout = sideLayout(d, resolvePortSides(project([d]), d))
    expect(layout.bottom.map((p) => p.id)).toEqual(['ETH1', 'ETH2', 'USB1', 'USB2', 'USB3', 'USB4', 'DC'])
  })

  it('vidéo « auto » : face au seul câble vidéo ; sans câble vidéo, le côté par défaut', () => {
    const d = server({ portSides: { video: 'auto', reseau: 'top' } })
    const right = peer('scr', 800, 0, 'displayport')
    const below = peer('sw', 0, 2000, 'rj45')
    const links: Project['links'] = [
      { id: 'l1', cableId: 'C-1', a: { deviceId: 'srv', portId: 'DP3' }, b: { deviceId: 'scr', portId: 'IN' }, medium: 'displayport' },
      { id: 'l2', cableId: 'C-2', a: { deviceId: 'srv', portId: 'ETH1' }, b: { deviceId: 'sw', portId: 'IN' }, medium: 'cat6' }
    ]
    const sides = resolvePortSides(project([d, right, below], links), d)
    expect(sideLayout(d, sides).right.map((p) => p.id)).toEqual(['DP1', 'DP2', 'DP3', 'DP4', 'DP5', 'DP6', 'DP7', 'DP8'])
    // défaut de l'appareil (auto) : moyenne des deux voisins → dy 2000 > dx 800 → bas
    expect(sides['DC']).toBe('bottom')
    const alone = resolvePortSides(project([d, below], [links[1]!]), d)
    expect(alone['DP1']).toBe('bottom')
  })

  it('sans portSides : tous les ports du côté résolu de l’appareil, dans leur ordre', () => {
    const d = server({ portSide: 'left' })
    const layout = sideLayout(d, resolvePortSides(project([d]), d))
    expect(layout.left.map((p) => p.id)).toEqual(d.ports.map((p) => p.id))
  })
})
