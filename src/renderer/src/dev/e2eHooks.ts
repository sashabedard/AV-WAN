import type { FitViewOptions, ReactFlowInstance } from '@xyflow/react'
import type { Project } from '../model/types'
import type { CordFlowEdge, FlowNode } from '../canvas/toFlow'
import { projectStore, type Selection } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { serializeProject } from '../model/file'
import { loadFromText } from '../app/fileActions'
import { handleMenuAction } from '../app/menuActions'
import type { MenuAction } from '../../../shared/api'
import type { PdfOptions } from '../../../shared/pdfOptions'
import { exportPdfAction } from '../export/exportActions'
import { makeStressProject } from './stress'
import { makeRenderFixture } from './renderFixture'

let flow: ReactFlowInstance<FlowNode, CordFlowEdge> | null = null

export function registerFlowInstance(instance: ReactFlowInstance<FlowNode, CordFlowEdge>): void {
  flow = instance
}

export interface E2EHooks {
  getProject(): Project
  select(selection: Selection): void
  setView(view: 'schema' | 'racks'): void
  loadStress(): void
  loadRenderFixture(): void
  fitView(padding?: FitViewOptions['padding']): Promise<boolean>
  setViewport(viewport: { x: number; y: number; zoom: number }): Promise<boolean>
  saveTo(path: string): Promise<void>
  openPath(path: string): Promise<boolean>
  menu(action: MenuAction): void
  exportPdf(options: PdfOptions): Promise<string | null>
}

export function installE2EHooks(): void {
  window.__avwan = {
    getProject: () => projectStore.getState().history.present,
    select: (selection) => projectStore.getState().setSelection(selection),
    setView: (view) => uiStore.getState().setView(view),
    menu: (action) => handleMenuAction(action),
    loadStress: () => projectStore.getState().loadProject(makeStressProject(), null),
    loadRenderFixture: () => projectStore.getState().loadProject(makeRenderFixture(), null),
    fitView: async (padding) => (flow ? flow.fitView({ padding: padding ?? 0.05 }) : false),
    setViewport: async (viewport) => (flow ? flow.setViewport(viewport) : false),
    saveTo: async (path) => {
      const snapshot = projectStore.getState().history.present
      await window.avwan.file.save(path, serializeProject(snapshot))
      projectStore.getState().markSaved(path, snapshot)
    },
    openPath: async (path) => {
      const file = await window.avwan.file.read(path)
      return loadFromText(file.path, file.text)
    },
    exportPdf: (options) => exportPdfAction(options)
  }
}
