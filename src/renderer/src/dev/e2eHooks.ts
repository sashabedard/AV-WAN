import type { ReactFlowInstance } from '@xyflow/react'
import type { Project } from '../model/types'
import type { CordFlowEdge, DeviceFlowNode } from '../canvas/toFlow'
import { projectStore, type Selection } from '../store/projectStore'
import { serializeProject } from '../model/file'
import { loadFromText } from '../app/fileActions'
import { handleMenuAction } from '../app/menuActions'
import type { MenuAction } from '../../../shared/api'
import { makeStressProject } from './stress'

let flow: ReactFlowInstance<DeviceFlowNode, CordFlowEdge> | null = null

export function registerFlowInstance(instance: ReactFlowInstance<DeviceFlowNode, CordFlowEdge>): void {
  flow = instance
}

export interface E2EHooks {
  getProject(): Project
  select(selection: Selection): void
  loadStress(): void
  fitView(): Promise<boolean>
  saveTo(path: string): Promise<void>
  openPath(path: string): Promise<boolean>
  menu(action: MenuAction): void
}

export function installE2EHooks(): void {
  window.__avwan = {
    getProject: () => projectStore.getState().history.present,
    select: (selection) => projectStore.getState().setSelection(selection),
    menu: (action) => handleMenuAction(action),
    loadStress: () => projectStore.getState().loadProject(makeStressProject(), null),
    fitView: async () => (flow ? flow.fitView({ padding: 0.05 }) : false),
    saveTo: async (path) => {
      const snapshot = projectStore.getState().history.present
      await window.avwan.file.save(path, serializeProject(snapshot))
      projectStore.getState().markSaved(path, snapshot)
    },
    openPath: async (path) => {
      const file = await window.avwan.file.read(path)
      return loadFromText(file.path, file.text)
    }
  }
}
