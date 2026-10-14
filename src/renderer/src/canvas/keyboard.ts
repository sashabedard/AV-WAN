import type { Project } from '../model/types'

export function arrowDelta(key: string, shift: boolean): { dx: number; dy: number } | null {
  const step = shift ? 1 : 8
  switch (key) {
    case 'ArrowLeft':
      return { dx: -step, dy: 0 }
    case 'ArrowRight':
      return { dx: step, dy: 0 }
    case 'ArrowUp':
      return { dx: 0, dy: -step }
    case 'ArrowDown':
      return { dx: 0, dy: step }
    default:
      return null
  }
}

export function nudgeMoves(project: Project, ids: readonly string[], delta: { dx: number; dy: number }): Array<{ id: string; position: { x: number; y: number } }> {
  const wanted = new Set(ids)
  return project.devices
    .filter((d) => wanted.has(d.id))
    .map((d) => ({ id: d.id, position: { x: d.position.x + delta.dx, y: d.position.y + delta.dy } }))
}
