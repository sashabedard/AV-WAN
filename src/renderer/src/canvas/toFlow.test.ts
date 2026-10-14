import { describe, expect, it } from 'vitest'
import { sampleProject } from '../model/__fixtures__/sample'
import { analyzeLinks, cordTag, createFlowCache, toFlowEdges, toFlowNodes } from './toFlow'

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
})

describe('toFlowEdges', () => {
  it('relie les poignées de ports et décrit le câble', () => {
    const p = sampleProject()
    const [edge] = toFlowEdges(p, analyzeLinks(p, 'light'), createFlowCache())
    expect(edge).toMatchObject({ id: 'l1', type: 'cord', source: 'sw1', sourceHandle: '1', target: 'cam1', targetHandle: 'ETH' })
    expect(edge!.data!.style.color).toBe('#2563C9')
    expect(cordTag(p, p.links[0]!)).toBe('C-001 · SW-1:1 ⇄ CAM-1:ETH · PoE+')
  })
})
