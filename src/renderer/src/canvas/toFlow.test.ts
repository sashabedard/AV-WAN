import { messages } from '../../../shared/i18n/messages'
import { describe, expect, it } from 'vitest'
import { sampleProject } from '../model/__fixtures__/sample'
import { createDevice, createProject } from '../model/project'
import { vlanPreset } from '../catalog/vlanPresets'
import type { Project } from '../model/types'
import { switchFacade } from './switchFacade'
import { NEUTRAL } from './cordStyle'
import { analyzeLinks, cordTag, createFlowCache, toFlowEdges, toFlowNodes, toFlowZones } from './toFlow'

describe('toFlowNodes', () => {
  it('crée un nœud switch et un nœud appareil avec les infos de ports', () => {
    const p = sampleProject()
    const nodes = toFlowNodes(p, analyzeLinks(p, 'dark', 'fr'), createFlowCache(), 'fr')
    expect(nodes.map((n) => n.type)).toEqual(['switch', 'device'])
    expect(nodes[0]!.data.ports['1']).toEqual({ linkId: 'l1', color: '#3E8EF7', poe: true })
    expect(nodes[1]!.data.ports['ETH']).toEqual({ linkId: 'l1', color: '#3E8EF7', poe: false })
    expect(nodes[0]!.data.poeUsage).toEqual({ usedW: 25, budgetW: 60 })
    expect(nodes[1]!.data.sides['ETH']).toBe('top')
  })

  it('dessine le panneau de brassage comme une façade de rack', () => {
    const p = createProject(undefined, 'fr')
    p.devices.push(createDevice(p, 'patch-panel-24', { x: 0, y: 0 }, { lang: 'fr' }))
    expect(toFlowNodes(p, analyzeLinks(p, 'dark', 'fr'), createFlowCache(), 'fr')[0]!.type).toBe('switch')
  })

  it("réutilise le même objet nœud tant que rien ne change pour l'appareil", () => {
    const p = sampleProject()
    const cache = createFlowCache()
    const first = toFlowNodes(p, analyzeLinks(p, 'dark', 'fr'), cache, 'fr')
    const p2 = { ...p, meta: { ...p.meta, title: 'Autre' } }
    const second = toFlowNodes(p2, analyzeLinks(p2, 'dark', 'fr'), cache, 'fr')
    expect(second[0]).toBe(first[0])
    expect(second[1]).toBe(first[1])
  })

  it("recrée le nœud quand le côté de ses prises change à cause d'un voisin déplacé", () => {
    const p = sampleProject()
    const cache = createFlowCache()
    const first = toFlowNodes(p, analyzeLinks(p, 'dark', 'fr'), cache, 'fr')
    const moved = { ...p, devices: p.devices.map((d, i) => (i === 0 ? { ...d, position: { x: 0, y: 600 } } : d)) }
    const second = toFlowNodes(moved, analyzeLinks(moved, 'dark', 'fr'), cache, 'fr')
    expect(second[1]).not.toBe(first[1])
    expect(second[1]!.data.sides['ETH']).toBe('bottom')
  })

  it('côtés par type : chaque prise a son côté, et changer un réglage refait la tuile', () => {
    const p = sampleProject()
    const cache = createFlowCache()
    const first = toFlowNodes(p, analyzeLinks(p, 'dark', 'fr'), cache, 'fr')
    const q = { ...p, devices: p.devices.map((d, i) => (i === 1 ? { ...d, portSides: { video: 'left' as const } } : d)) }
    const second = toFlowNodes(q, analyzeLinks(q, 'dark', 'fr'), cache, 'fr')
    expect(second[1]!.data.sides).toEqual({ ETH: 'top', HDMI: 'left' })
    expect(second[1]).not.toBe(first[1])
    expect(second[0]).toBe(first[0])
  })

  it('passe les VMs à leur hôte ; changer une VM ne refait que la tuile de son hôte', () => {
    const p = { ...sampleProject(), vms: [{ id: 'v', hostId: 'cam1', name: 'VM 1', vnics: [] }] }
    const cache = createFlowCache()
    const first = toFlowNodes(p, analyzeLinks(p, 'dark', 'fr'), cache, 'fr')
    expect(first[1]!.data.vms.map((v) => v.id)).toEqual(['v'])
    expect(first[0]!.data.vms).toEqual([])
    const q = { ...p, vms: [{ ...p.vms[0]!, name: 'Show' }] }
    const second = toFlowNodes(q, analyzeLinks(q, 'dark', 'fr'), cache, 'fr')
    expect(second[1]).not.toBe(first[1])
    expect(second[0]).toBe(first[0])
  })

  it('met en haut les prises d’un appareil placé sous la moitié droite d’un switch 48 ports', () => {
    const p = createProject(undefined, 'fr')
    const sw = createDevice(p, 'switch', { x: 0, y: 0 }, { lang: 'fr', switchSpec: { portCount: 48, poe: 'at', sfpPlus: 4, managed: true } })
    p.devices.push(sw)
    const cam = createDevice(p, 'ptz-ndi', { x: 371, y: 200 }, { lang: 'fr' })
    p.devices.push(cam)
    p.links.push({ id: 'l1', cableId: 'C-001', a: { deviceId: sw.id, portId: '40' }, b: { deviceId: cam.id, portId: 'ETH' }, medium: 'cat6' })
    const nodes = toFlowNodes(p, analyzeLinks(p, 'dark', 'fr'), createFlowCache(), 'fr')
    expect(nodes[1]!.data.sides['ETH']).toBe('top')
  })

  it('met l’adresse DMX sur la 2ᵉ ligne et refait la tuile quand l’univers du nœud change', () => {
    let p = createProject(undefined, 'fr')
    const ode = { ...createDevice(p, 'dmx-node', { x: 0, y: 0 }, { lang: 'fr', id: 'ode' }), portState: { 'DMX-1': { universe: 1 } } }
    const f = { ...createDevice(p, 'dmx-fixture', { x: 0, y: 200 }, { lang: 'fr', id: 'f' }), dmx: { footprint: 16, address: 33 } }
    p = { ...p, devices: [ode, f], links: [{ id: 'l', cableId: 'C-001', a: { deviceId: 'ode', portId: 'DMX-1' }, b: { deviceId: 'f', portId: 'DMX-IN' }, medium: 'dmx' }] }
    const cache = createFlowCache()
    const first = toFlowNodes(p, analyzeLinks(p, 'dark', 'fr'), cache, 'fr').find((n) => n.id === 'f')!
    expect(first.data.line2).toBe('U1 · 33')
    const q = { ...p, devices: [{ ...ode, portState: { 'DMX-1': { universe: 4 } } }, f] }
    const second = toFlowNodes(q, analyzeLinks(q, 'dark', 'fr'), cache, 'fr').find((n) => n.id === 'f')!
    expect(second.data.line2).toBe('U4 · 33')
    expect(second).not.toBe(first)
  })
})

describe('toFlowEdges', () => {
  it('indique le bout qui fournit le PoE', () => {
    const p = sampleProject()
    const [edge] = toFlowEdges(p, analyzeLinks(p, 'dark', 'fr'), createFlowCache(), messages('fr'))
    expect(edge!.data!.poeAt).toBe('source')
    const flipped = { ...p, links: [{ ...p.links[0]!, a: p.links[0]!.b, b: p.links[0]!.a }] }
    expect(toFlowEdges(flipped, analyzeLinks(flipped, 'dark', 'fr'), createFlowCache(), messages('fr'))[0]!.data!.poeAt).toBe('target')
    const off = { ...p, devices: p.devices.map((d) => (d.id === 'sw1' ? { ...d, portState: { '1': { ...d.portState['1'], poeEnabled: false } } } : d)) }
    expect(toFlowEdges(off, analyzeLinks(off, 'dark', 'fr'), createFlowCache(), messages('fr'))[0]!.data!.poeAt).toBeNull()
  })
  it('mesure, depuis la poignée, la distance jusqu’au bord du nœud : positive sur une façade de rack, nulle sur une tuile', () => {
    const p = sampleProject()
    const edge = toFlowEdges(p, analyzeLinks(p, 'dark', 'fr'), createFlowCache(), messages('fr'))[0]!
    const sw = p.devices.find((d) => d.switch)!
    const facade = switchFacade(sw.ports)
    const port = facade.ports.find((f) => f.id === edge.sourceHandle)!
    expect(edge.data!.exits[0]).toBe(facade.height - (port.y + port.h))
    expect(edge.data!.exits[0]).toBeGreaterThan(0)
    expect(edge.data!.exits[1]).toBe(0)
  })

  it('relie les poignées de ports et décrit le câble', () => {
    const p = sampleProject()
    const [edge] = toFlowEdges(p, analyzeLinks(p, 'light', 'fr'), createFlowCache(), messages('fr'))
    expect(edge).toMatchObject({ id: 'l1', type: 'cord', source: 'sw1', sourceHandle: '1', target: 'cam1', targetHandle: 'ETH' })
    expect(edge!.data!.style.color).toBe('#2563C9')
    expect(cordTag(p, p.links[0]!, messages('fr'))).toBe('C-001 · SW-1:1 ⇄ CAM-1:ETH · PoE+')
  })

  it('donne l’étiquette de port de chaque bout', () => {
    const p = sampleProject()
    const [edge] = toFlowEdges(p, analyzeLinks(p, 'dark', 'fr'), createFlowCache(), messages('fr'))
    expect(edge!.data!.portLabels).toEqual(['1', 'ETH'])
  })
})

describe('VLAN des nœuds et des arêtes', () => {
  it('chaque nœud et chaque câble connaissent leurs VLAN', () => {
    const p = sampleProject()
    const analysis = analyzeLinks(p, 'dark', 'fr')
    const nodes = toFlowNodes(p, analysis, createFlowCache(), 'fr')
    const [edge] = toFlowEdges(p, analysis, createFlowCache(), messages('fr'))
    expect(nodes.map((n) => n.data.vlans)).toEqual([[40], [40]])
    expect(edge!.data!.vlans).toEqual([40])
  })
})

describe('radio Wi-Fi à plusieurs clients', () => {
  function apWithClients(vlans: [number, number]): { p: Project; apId: string } {
    let p: Project = { ...createProject(undefined, 'fr'), vlans: [vlanPreset(20, 'fr'), vlanPreset(60, 'fr')] }
    const ap = createDevice(p, 'ap', { x: 0, y: 0 }, { lang: 'fr' })
    p = { ...p, devices: [ap] }
    vlans.forEach((vlan, i) => {
      const c = createDevice(p, 'esp32-devkit', { x: i * 200, y: 200 }, { lang: 'fr' })
      p = { ...p, devices: [...p.devices, { ...c, portState: { WIFI: { mode: 'access', nativeVlan: vlan } } }] }
      p.links.push({ id: `w${i}`, cableId: `C-00${i + 1}`, a: { deviceId: c.id, portId: 'WIFI' }, b: { deviceId: ap.id, portId: 'WIFI' }, medium: 'wifi' })
    })
    return { p, apId: ap.id }
  }

  it('garde la couleur commune, ou passe au neutre si les VLAN diffèrent', () => {
    const same = apWithClients([60, 60])
    expect(analyzeLinks(same.p, 'dark', 'fr').ports.get(same.apId)!['WIFI']!.color).toBe('#F2C94C')
    const mixed = apWithClients([20, 60])
    expect(analyzeLinks(mixed.p, 'dark', 'fr').ports.get(mixed.apId)!['WIFI']!.color).toBe(NEUTRAL.dark)
  })
})

describe('toFlowZones', () => {
  it('fait un nœud de zone sous le reste, déplaçable par son titre, réutilisé tant qu’il ne change pas', () => {
    const p = { ...sampleProject(), zones: [{ id: 'z1', name: 'Salle', color: '#3E8EF7', rect: { x: -24, y: 148, w: 224, h: 134 }, ownPdfPage: false }] }
    const cache = createFlowCache()
    const [node] = toFlowZones(p, cache)
    expect(node).toMatchObject({ id: 'z1', type: 'zone', position: { x: -24, y: 148 }, width: 224, height: 134, zIndex: -1, dragHandle: '.zone__title' })
    expect(node!.style?.pointerEvents).toBe('none') // le corps laisse passer les clics (le style inline de React Flow écraserait le CSS)
    expect(toFlowZones({ ...p, meta: { ...p.meta, title: 'Autre' } }, cache)[0]).toBe(node)
    expect(toFlowZones({ ...p, zones: [] }, cache)).toEqual([])
    expect(cache.zones.size).toBe(0)
  })
})
