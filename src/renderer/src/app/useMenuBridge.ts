import { useEffect } from 'react'
import { projectStore } from '../store/projectStore'
import { newProjectAction, openProjectAction, saveProjectAction, saveProjectAsAction } from './fileActions'
import { routeUndoRedo } from './routeEditCommand'

export function useMenuBridge(): void {
  useEffect(
    () =>
      window.avwan.onMenu((action) => {
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
        }
      }),
    []
  )
}
