import type { MenuItemConstructorOptions } from 'electron'
import type { MenuAction } from '../shared/api'
import { APP_NAME } from '../shared/appInfo'

// Actions du menu Aide, fournies par le processus principal (boîtes de dialogue, navigateur).
export interface HelpHandlers {
  about(): void
  checkUpdates(): void
  releases(): void
}

const SEPARATOR: MenuItemConstructorOptions = { type: 'separator' }

// Gabarit du menu, sans Electron à l'exécution : testable sous Vitest.
export function menuTemplate(isMac: boolean, send: (action: MenuAction) => void, help: HelpHandlers): MenuItemConstructorOptions[] {
  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: APP_NAME,
          submenu: [
            { role: 'about', label: `À propos d’${APP_NAME}` },
            SEPARATOR,
            { role: 'hide', label: `Masquer ${APP_NAME}` },
            { role: 'hideOthers', label: 'Masquer les autres' },
            { role: 'unhide', label: 'Tout afficher' },
            SEPARATOR,
            { role: 'quit', label: `Quitter ${APP_NAME}` }
          ]
        }
      ]
    : []
  const quitItems: MenuItemConstructorOptions[] = isMac ? [] : [SEPARATOR, { role: 'quit', label: 'Quitter' }]
  const helpItems: MenuItemConstructorOptions[] = [
    ...(isMac ? [] : [{ label: `À propos d’${APP_NAME}`, click: () => help.about() }, SEPARATOR]),
    { label: 'Rechercher les mises à jour…', click: () => help.checkUpdates() },
    { label: 'Téléchargements et notes de version…', click: () => help.releases() }
  ]
  return [
    ...appMenu,
    {
      label: 'Fichier',
      submenu: [
        { label: 'Nouveau projet', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: 'Ouvrir…', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        SEPARATOR,
        { label: 'Enregistrer', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Enregistrer sous…', accelerator: 'Shift+CmdOrCtrl+S', click: () => send('saveAs') },
        SEPARATOR,
        { label: 'Exporter le PDF…', accelerator: 'CmdOrCtrl+E', click: () => send('exportPdf') },
        { label: 'Exporter les listes en CSV…', click: () => send('exportCsv') },
        { label: 'Exporter les listes en Excel…', click: () => send('exportXlsx') },
        ...quitItems
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
        { label: 'Rétablir', accelerator: 'Shift+CmdOrCtrl+Z', click: () => send('redo') },
        SEPARATOR,
        { label: 'Rechercher un appareil…', accelerator: 'CmdOrCtrl+K', click: () => send('search') },
        SEPARATOR,
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { label: 'Dupliquer', accelerator: 'CmdOrCtrl+D', click: () => send('duplicate') },
        { label: 'Créer une zone autour de la sélection', accelerator: 'CmdOrCtrl+G', click: () => send('groupZone') },
        { role: 'selectAll', label: 'Tout sélectionner' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Cadrer tout', accelerator: 'CmdOrCtrl+0', click: () => send('fitView') },
        { label: 'Zoom avant', accelerator: 'CmdOrCtrl+Plus', click: () => send('zoomIn') },
        { label: 'Zoom arrière', accelerator: 'CmdOrCtrl+-', click: () => send('zoomOut') },
        SEPARATOR,
        { label: 'Épingler cette vue', accelerator: 'Shift+CmdOrCtrl+P', click: () => send('pinView') },
        { label: 'Retirer la vue épinglée', click: () => send('unpinView') },
        SEPARATOR,
        { role: 'reload', label: 'Recharger' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
        SEPARATOR,
        { role: 'togglefullscreen', label: 'Plein écran' }
      ]
    },
    { label: 'Aide', role: 'help', submenu: helpItems }
  ]
}
