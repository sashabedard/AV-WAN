import { describe, expect, it } from 'vitest'
import { sampleProject } from '../model/__fixtures__/sample'
import { createDevice, createProject } from '../model/project'
import { vlanPreset } from '../catalog/vlanPresets'
import type { Project } from '../model/types'
import { NEUTRAL } from './cordStyle'
import { analyzeLinks, cordTag, createFlowCache, toFlowEdges, toFlowNodes, toFlowZones } from './toFlow'

describe('toFlowNodes', () => {
  it('crée un nœud switch et un nœud appareil avec les infos de ports', () => {
    const p = sampleProject()
    const nodes = toFlowNodes(p, analyzeLinks(p, 'dark'), createFlowCache())
    expect(nodes.map((n) => n.type)).toEqual(['switch', 'device'])
    expect(nodes[0]!.data.ports['1']).toEqual({ linkId: 'l1', color: '#3E8EF7', poe: true })
    expect(nodes[1]!.data.ports['ETH']).toEqual({ linkId: 'l1', color: '#3E8EF7', poe: false })
    expect(nodes[0]!.data.poeUsage).toEqual({ usedW: 25, budgetW: 60 })
    expect(nodes[1]!.data.side).toBe('top')
  })

  it("réutilise le même objet nœud tant que rien ne change pour l'appareil", () => {
    const p = sampleProject()
    const cache = createFlowCache()
    const first = toFlowNodes(p, analyzeLinks(p, 'dark'), cache)
    const p2 = { ...p, meta: { ...p.meta, title: 'Autre' } }
    const second = toFlowNodes(p2, analyzeLinks(p2, 'dark'), cache)
    expect(second[0]).toBe(first[0])
    expect(second[1]).toBe(first[1])
  })

  it("recrée le nœud quand le côté de ses prises change à cause d'un voisin déplacé", () => {
    const p = sampleProject()
    const cache = createFlowCache()
    const first = toFlowNodes(p, analyzeLinks(p, 'dark'), cache)
    const moved = { ...p, devices: p.devices.map((d, i) => (i === 0 ? { ...d, position: { x: 0, y: 600 } } : d)) }
    const second = toFlowNodes(moved, analyzeLinks(moved, 'dark'), cache)
    expect(second[1]).not.toBe(first[1])
    expect(second[1]!.data.side).toBe('bottom')
  })

  it('met en haut les prises d’un appareil placé sous la moitié droite d’un switch 48 ports', () => {
    const p = createProject()
    const sw = createDevice(p, 'switch', { x: 0, y: 0 }, { switchSpec: { portCount: 48, poe: 'at', sfpPlus: 4, managed: true } })
    p.devices.push(sw)
    const cam = createDevice(p, 'ptz-ndi', { x: 371, y: 200 })
    p.devices.push(cam)
    p.links.push({ id: 'l1', cableId: 'C-001', a: { deviceId: sw.id, portId: '40' }, b: { deviceId: cam.id, portId: 'ETH' }, medium: 'cat6' })
    const nodes = toFlowNodes(p, analyzeLinks(p, 'dark'), createFlowCache())
    expect(nodes[1]!.data.side).toBe('top')
  })
})

describe('toFlowEdges', () => {
  it('indique le bout qui fournit le PoE', () => {
    const p = sampleProject()
    const [edge] = toFlowEdges(p, analyzeLinks(p, 'dark'), createFlowCache())
    expect(edge!.data!.poeAt).toBe('source')
    const flipped = { ...p, links: [{ ...p.links[0]!, a: p.links[0]!.b, b: p.links[0]!.a }] }
    expect(toFlowEdges(flipped, analyzeLinks(flipped, 'dark'), createFlowCache())[0]!.data!.poeAt).toBe('target')
    const off = { ...p, devices: p.devices.map((d) => (d.id === 'sw1' ? { ...d, portState: { '1': { ...d.portState['1'], poeEnabled: false } } } : d)) }
    expect(toFlowEdges(off, analyzeLinks(off, 'dark'), createFlowCache())[0]!.data!.poeAt).toBeNull()
  })
  it('relie les poignées de ports et décrit le câble', () => {
    const p = sampleProject()
    const [edge] = toFlowEdges(p, analyzeLinks(p, 'light'), createFlowCache())
    expect(edge).toMatchObject({ id: 'l1', type: 'cord', source: 'sw1', sourceHandle: '1', target: 'cam1', targetHandle: 'ETH' })
    expect(edge!.data!.style.color).toBe('#2563C9')
    expect(cordTag(p, p.links[0]!)).toBe('C-001 · SW-1:1 ⇄ CAM-1:ETH · PoE+')
  })

  it('donne l’étiquette de port de chaque bout', () => {
    const p = sampleProject()
    const [edge] = toFlowEdges(p, analyzeLinks(p, 'dark'), createFlowCache())
    expect(edge!.data!.portLabels).toEqual(['1', 'ETH'])
  })
})

describe('VLAN des nœuds et des arêtes', () => {
  it('chaque nœud et chaque câble connaissent leurs VLAN', () => {
    const p = sampleProject()
    const analysis = analyzeLinks(p, 'dark')
    const nodes = toFlowNodes(p, analysis, createFlowCache())
    const [edge] = toFlowEdges(p, analysis, createFlowCache())
    expect(nodes.map((n) => n.data.vlans)).toEqual([[40], [40]])
    expect(edge!.data!.vlans).toEqual([40])
  })
})

describe('radio Wi-Fi à plusieurs clients', () => {
  function apWithClients(vlans: [number, number]): { p: Project; apId: string } {
    let p: Project = { ...createProject(), vlans: [vlanPreset(20), vlanPreset(60)] }
    const ap = createDevice(p, 'ap', { x: 0, y: 0 })
    p = { ...p, devices: [ap] }
    vlans.forEach((vlan, i) => {
      const c = createDevice(p, 'esp32-devkit', { x: i * 200, y: 200 })
      p = { ...p, devices: [...p.devices, { ...c, portState: { WIFI: { mode: 'access', nativeVlan: vlan } } }] }
      p.links.push({ id: `w${i}`, cableId: `C-00${i + 1}`, a: { deviceId: c.id, portId: 'WIFI' }, b: { deviceId: ap.id, portId: 'WIFI' }, medium: 'wifi' })
    })
    return { p, apId: ap.id }
  }

  it('garde la couleur commune, ou passe au neutre si les VLAN diffèrent', () => {
    const same = apWithClients([60, 60])
    expect(analyzeLinks(same.p, 'dark').ports.get(same.apId)!['WIFI']!.color).toBe('#F2C94C')
    const mixed = apWithClients([20, 60])
    expect(analyzeLinks(mixed.p, 'dark').ports.get(mixed.apId)!['WIFI']!.color).toBe(NEUTRAL.dark)
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
