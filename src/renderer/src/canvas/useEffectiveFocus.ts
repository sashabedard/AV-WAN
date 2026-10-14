import type { Project } from '../model/types'
import { useProjectStore } from '../store/projectStore'
import { useUiStore } from '../store/uiStore'

// Le focus VLAN n'atténue que le mode « VLAN » et un VLAN qui existe encore dans le projet.
export function effectiveFocus(project: Pick<Project, 'settings' | 'vlans'>, focus: number | null): number | null {
  if (focus === null || project.settings.colorMode !== 'vlan') return null
  return project.vlans.some((v) => v.id === focus) ? focus : null
}

export function useEffectiveFocus(): number | null {
  const focus = useUiStore((s) => s.focusVlan)
  return useProjectStore((s) => effectiveFocus(s.history.present, focus))
}
