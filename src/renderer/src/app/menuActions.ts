// src/renderer/src/app/menuActions.ts
import type { MenuAction } from '../../../shared/api'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { newProjectAction, openProjectAction, saveProjectAction, saveProjectAsAction } from './fileActions'
import { fitAll, zoomIn, zoomOut } from '../canvas/viewport'
import { routeUndoRedo } from './routeEditCommand'

// Point d'entrée unique des commandes du menu natif (et des tests de bout en bout).
export function handleMenuAction(action: MenuAction): void {
  switch (action) {
    case 'new':
      newProjectAction()
      break
    case 'open':
      void openProjectAction()
      break
    case 'save':
      void saveProjectAction()
      break
    case 'saveAs':
      void saveProjectAsAction()
      break
    case 'undo':
    case 'redo':
      routeUndoRedo(action, document.activeElement, document, projectStore.getState())
      break
    case 'search':
      uiStore.getState().openSearch(null)
      break
    case 'fitView':
      fitAll()
      break
    case 'zoomIn':
      zoomIn()
      break
    case 'zoomOut':
      zoomOut()
      break
  }
}
