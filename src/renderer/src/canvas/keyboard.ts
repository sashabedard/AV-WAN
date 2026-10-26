import type { Project } from '../model/types'
import type { Selection } from '../store/projectStore'

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

// Suppr / Retour arrière avec une VM sélectionnée : les tuiles de VM ne sont pas des nœuds React Flow,
// le canvas les supprime lui-même (l'hôte reste).
export function vmsToDelete(key: string, selection: Selection): string[] | null {
  if (key !== 'Delete' && key !== 'Backspace') return null
  return selection.vmIds && selection.vmIds.length > 0 ? selection.vmIds : null
}

