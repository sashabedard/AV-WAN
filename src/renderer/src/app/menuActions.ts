// src/renderer/src/app/menuActions.ts
import type { MenuAction } from '../../../shared/api'
import { projectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { newProjectAction, openProjectAction, revertToOpenedAction, saveProjectAction, saveProjectAsAction } from './fileActions'
import { fitAll, pinCurrentView, unpinView, zoomIn, zoomOut } from '../canvas/viewport'
import { isTextInput, routeUndoRedo } from './routeEditCommand'
import { duplicateSelection } from './clipboardActions'
import { exportCsvAction, exportXlsxAction } from '../export/exportActions'

// Point d'entrée unique des commandes du menu natif (et des tests de bout en bout).
export function handleMenuAction(action: MenuAction): void {
  // L'écran d'accueil recouvre le canvas : on le ferme avant d'agir (« Ouvrir » le ferme seulement si un fichier s'ouvre).
  if (uiStore.getState().welcome && action !== 'open') uiStore.getState().setWelcome(false)
  switch (action) {
    case 'new':
      newProjectAction()
      break
    case 'open': {
      const wasWelcome = uiStore.getState().welcome
      const doc = projectStore.getState().docId
      void openProjectAction().then(() => {
        if (wasWelcome && projectStore.getState().docId !== doc) uiStore.getState().setWelcome(false)
      })
      break
    }
    case 'save':
      void saveProjectAction()
      break
    case 'saveAs':
      void saveProjectAsAction()
      break
    case 'revertToOpened':
      void revertToOpenedAction()
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
    case 'pinView':
      pinCurrentView()
      break
    case 'unpinView':
      unpinView()
      break
    case 'duplicate':
      if (!isTextInput(document.activeElement)) duplicateSelection()
      break
    case 'groupZone':
      projectStore.getState().zoneAroundSelection()
      break
    case 'exportPdf':
      uiStore.getState().setExportOpen(true)
      break
    case 'exportCsv':
      void exportCsvAction()
      break
    case 'exportXlsx':
      void exportXlsxAction()
      break
    case 'whatsNew':
      uiStore.getState().setWhatsNewOpen(true)
      break
  }
}
