import { describe, expect, it } from 'vitest'
import { toRackFlow, type RackFlowNode } from './toRackFlow'
import { RACK_STUB_H, RACK_U_PX, layoutRacks } from './rackLayout'
import { rackSample } from './__fixtures__/rackSample'
import { analyzeLinks, createFlowCache, toFlowEdges } from '../canvas/toFlow'
import { switchFacade } from '../canvas/switchFacade'
import { messages } from '../../../shared/i18n/messages'
import type { Project } from '../model/types'

const fr = messages('fr')
const en = messages('en')
const byId = (nodes: RackFlowNode[], id: string) => nodes.find((n) => n.id === id)

describe('toRackFlow : nœuds', () => {
  it('baie, switch (façade), appareil générique (bloc) et bout de câble', () => {
    const { nodes } = toRackFlow(rackSample(), 'dark', fr)
    expect(byId(nodes, 'r1')?.type).toBe('rack')
    expect(byId(nodes, 'sw1')?.type).toBe('switch')
    expect(byId(nodes, 'mac')?.type).toBe('rackDevice')
    expect(byId(nodes, 'stub-l1')?.type).toBe('stub')
    expect(nodes).toHaveLength(4)
  })

  it('Review Focus 5 : aucun nœud pour l’appareil hors baie (CAM-1)', () => {
    const { nodes } = toRackFlow(rackSample(), 'dark', fr)
    expect(byId(nodes, 'cam1')).toBeUndefined()
    expect(nodes.some((n) => 'device' in n.data && n.data.device.name === 'CAM-1')).toBe(false)
  })

  it('la switch garde les mêmes DeviceNodeData que le schéma, alignée à gauche et centrée dans sa fente', () => {
    const p = rackSample()
    const { nodes } = toRackFlow(p, 'dark', fr)
    const sw = byId(nodes, 'sw1')!
    const s = layoutRacks(p).slots.find((x) => x.deviceId === 'sw1')!
    const facade = switchFacade(p.devices[0]!.ports)
    expect(sw.position).toEqual({ x: s.x, y: s.y + (RACK_U_PX - facade.height) / 2 })
    expect(sw.draggable).toBe(true)
    expect(sw.data).toMatchObject({ device: p.devices[0], vlans: [40], ports: { '1': { linkId: 'l1' }, '2': { linkId: 'l2' } } })
    expect('poeUsage' in sw.data && sw.data.poeUsage).toEqual({ usedW: 25, budgetW: 60 })
  })

  it('l’appareil générique occupe sa fente (pleine largeur, heightU × 92)', () => {
    const p = rackSample()
    const { nodes } = toRackFlow(p, 'dark', fr)
    const mac = byId(nodes, 'mac')!
    const s = layoutRacks(p).slots.find((x) => x.deviceId === 'mac')!
    expect(mac.position).toEqual({ x: s.x, y: s.y })
    expect(mac.width).toBe(s.w)
    expect(mac.height).toBe(2 * RACK_U_PX)
    expect(mac.draggable).toBe(true)
    expect(mac.data).toMatchObject({ heightU: 2, ports: { ETH: { linkId: 'l2' } } })
  })

  it('baie : non déplaçable, non sélectionnable par la boîte ; zone et plages libres comptées', () => {
    const { nodes } = toRackFlow(rackSample(), 'dark', fr)
    const rack = byId(nodes, 'r1')!
    expect(rack.draggable).toBe(false)
    expect(rack.selectable).toBe(false)
    if (rack.type !== 'rack') throw new Error('rack')
    expect(rack.data.zoneName).toBe('Régie')
    // SW-1 en U1, MAC-1 en U3–U4 : libres U2 (1) et U5–U12 (8), du haut vers le bas
    expect(rack.data.free.map((f) => f.n)).toEqual([8, 1])
    expect(rack.data.free[0]!.h).toBe(8 * RACK_U_PX)
  })

  it('bout de câble : non sélectionnable, à droite de sa baie, à la hauteur du port', () => {
    const p = rackSample()
    const { nodes } = toRackFlow(p, 'dark', fr)
    const stub = byId(nodes, 'stub-l1')!
    const rack = layoutRacks(p).racks[0]!
    expect(stub.selectable).toBe(false)
    expect(stub.draggable).toBe(false)
    expect(stub.connectable).toBe(false)
    expect(stub.position.x).toBeGreaterThan(rack.x + rack.w)
    const sw = byId(nodes, 'sw1')!
    const port1 = switchFacade(p.devices[0]!.ports).ports.find((q) => q.id === '1')!
    expect(stub.position.y + RACK_STUB_H / 2).toBe(sw.position.y + port1.y + port1.h / 2)
    expect(stub.height).toBe(RACK_STUB_H)
  })
})

describe('toRackFlow : câbles', () => {
  it('une arête SW-1 → MAC-1 et une arête SW-1 → bout de câble', () => {
    const { edges } = toRackFlow(rackSample(), 'dark', fr)
    expect(edges.map((e) => [e.id, e.source, e.sourceHandle, e.target, e.targetHandle])).toEqual([
      ['l1', 'sw1', '1', 'stub-l1', 'stub'],
      ['l2', 'sw1', '2', 'mac', 'ETH']
    ])
    expect(edges.every((e) => e.type === 'cord')).toBe(true)
  })

  it('même CordEdgeData que le schéma ; le bout côté stub n’a pas de sortie de façade', () => {
    const p = rackSample()
    const analysis = analyzeLinks(p, 'dark', 'fr')
    const schema = toFlowEdges(p, analysis, createFlowCache(), fr)
    const { edges } = toRackFlow(p, 'dark', fr)
    const l2 = edges.find((e) => e.id === 'l2')!
    expect(l2.data).toEqual(schema.find((e) => e.id === 'l2')!.data)
    const l1 = edges.find((e) => e.id === 'l1')!
    const ref = schema.find((e) => e.id === 'l1')!.data!
    expect(l1.data).toEqual({ ...ref, exits: [ref.exits[0], 0] })
  })

  it('le coude du schéma n’est pas repris dans la baie', () => {
    const p = rackSample()
    const bent: Project = { ...p, links: p.links.map((l) => ({ ...l, elbow: { dx: 120, dy: -40 } })) }
    const { edges } = toRackFlow(bent, 'dark', fr)
    expect(edges.map((e) => e.data!.link.elbow)).toEqual([undefined, undefined])
    expect(bent.links.every((l) => l.elbow?.dx === 120)).toBe(true)
  })

  it('l’étiquette du bout de câble nomme la destination : → CAM-1 · ETH (FR et EN)', () => {
    const stubLabel = (m: typeof fr): string => {
      const s = byId(toRackFlow(rackSample(), 'dark', m).nodes, 'stub-l1')!
      return s.type === 'stub' ? s.data.label : ''
    }
    expect(stubLabel(fr)).toBe('→ CAM-1 · ETH')
    expect(stubLabel(en)).toBe('→ CAM-1 · ETH')
  })

  it('bout côté a hors baie : le stub devient la source, l’arête garde l’orientation du câble', () => {
    const p = rackSample()
    const flipped: Project = { ...p, links: p.links.map((l) => (l.id === 'l1' ? { ...l, a: l.b, b: l.a } : l)) }
    const e = toRackFlow(flipped, 'dark', fr).edges.find((x) => x.id === 'l1')!
    expect([e.source, e.sourceHandle, e.target, e.targetHandle]).toEqual(['stub-l1', 'stub', 'sw1', '1'])
    expect(e.data!.exits[0]).toBe(0)
  })

  it('câble entre deux baies : une arête normale, pas de stub', () => {
    const p = rackSample()
    const two: Project = {
      ...p,
      racks: [...p.racks!, { id: 'r2', name: 'BAIE-2', heightU: 6 }],
      devices: p.devices.map((d) => (d.id === 'cam1' ? { ...d, rack: { rackId: 'r2', u: 1, heightU: 1 } } : d))
    }
    const { nodes, edges } = toRackFlow(two, 'dark', fr)
    expect(nodes.filter((n) => n.type === 'stub')).toHaveLength(0)
    expect(edges.find((e) => e.id === 'l1')?.target).toBe('cam1')
  })

  it('câble sans bout en baie : absent', () => {
    const p = rackSample()
    const none: Project = { ...p, devices: p.devices.map(({ rack: _r, ...d }) => d) }
    const { nodes, edges } = toRackFlow(none, 'dark', fr)
    expect(edges).toEqual([])
    expect(nodes.map((n) => n.type)).toEqual(['rack'])
  })

  it('opts.cables false : zéro arête, zéro stub', () => {
    const { nodes, edges } = toRackFlow(rackSample(), 'dark', fr, { cables: false })
    expect(edges).toEqual([])
    expect(nodes.some((n) => n.type === 'stub')).toBe(false)
    expect(nodes.map((n) => n.id).sort()).toEqual(['mac', 'r1', 'sw1'])
  })

  it('deux bouts de câble à la même hauteur ne se chevauchent pas', () => {
    const p = rackSample()
    const cam2 = { ...p.devices[1]!, id: 'cam2', name: 'CAM-2', position: { x: 200, y: 200 } }
    const more: Project = {
      ...p,
      devices: [...p.devices, cam2],
      links: [...p.links, { id: 'l3', cableId: 'C-003', a: { deviceId: 'sw1', portId: '3' }, b: { deviceId: 'cam2', portId: 'ETH' }, medium: 'cat6', lengthM: 5 }]
    }
    const stubs = toRackFlow(more, 'dark', fr).nodes.filter((n) => n.type === 'stub')
    expect(stubs).toHaveLength(2)
    const [a, b] = stubs.map((s) => s.position.y).sort((x, y) => x - y)
    expect(b! - a!).toBeGreaterThanOrEqual(RACK_STUB_H)
  })
})

describe('toRackFlow : pureté', () => {
  it('ne modifie pas le projet', () => {
    const p = rackSample()
    const before = JSON.stringify(p)
    toRackFlow(p, 'dark', fr)
    toRackFlow(p, 'light', en, { cables: false })
    expect(JSON.stringify(p)).toBe(before)
  })

  it('mémorisé par projet, thème, langue et variante', () => {
    const p = rackSample()
    const a = toRackFlow(p, 'dark', fr)
    expect(toRackFlow(p, 'dark', fr)).toBe(a)
    expect(toRackFlow(p, 'light', fr)).not.toBe(a)
    expect(toRackFlow(p, 'dark', en)).not.toBe(a)
    expect(toRackFlow(p, 'dark', fr, { cables: false })).not.toBe(a)
    expect(toRackFlow(rackSample(), 'dark', fr)).not.toBe(a)
  })

  it('les couleurs suivent le thème (cordon du schéma au même thème)', () => {
    const p = rackSample()
    const light = toRackFlow(p, 'light', fr).edges.find((e) => e.id === 'l1')!
    const dark = toRackFlow(p, 'dark', fr).edges.find((e) => e.id === 'l1')!
    expect(light.data!.style.color).toBe('#2563C9')
    expect(dark.data!.style.color).toBe('#3E8EF7')
  })
})
