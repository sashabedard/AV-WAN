import type { CordFlowEdge, DeviceFlowNode } from './toFlow'

export const GRID = 8

export function snapPoint(p: { x: number; y: number }, on: boolean): { x: number; y: number } {
  return on ? { x: Math.round(p.x / GRID) * GRID, y: Math.round(p.y / GRID) * GRID } : { x: p.x, y: p.y }
}

// Les nœuds dérivés du store n'ont ni dimensions mesurées ni sélection : on les reprend de l'état local.
export function mergeNodes(derived: DeviceFlowNode[], prev: DeviceFlowNode[]): DeviceFlowNode[] {
  const byId = new Map(prev.map((n) => [n.id, n]))
  return derived.map((n) => {
    const p = byId.get(n.id)
    if (!p || (p.measured === undefined && !p.selected)) return n
    return { ...n, ...(p.measured ? { measured: p.measured } : {}), selected: p.selected ?? false }
  })
}

// Vrai quand l'état de React Flow reflète déjà les nœuds dérivés du projet courant (mergeNodes garde l'objet position).
export function nodesMatchDerived(nodes: ReadonlyArray<{ id: string; position: unknown }>, derived: ReadonlyArray<{ id: string; position: unknown }>): boolean {
  return nodes.length === derived.length && nodes.every((n, i) => n.id === derived[i].id && n.position === derived[i].position)
}

export function mergeEdges(derived: CordFlowEdge[], prev: CordFlowEdge[]): CordFlowEdge[] {
  const selected = new Set(prev.filter((e) => e.selected).map((e) => e.id))
  return derived.map((e) => (selected.has(e.id) ? { ...e, selected: true } : e))
}
