import { BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron'
import { IPC, type MenuAction } from '../shared/api'
import { APP_NAME } from '../shared/appInfo'

function send(action: MenuAction): void {
  BrowserWindow.getFocusedWindow()?.webContents.send(IPC.menu, action)
}

export function buildMenu(): void {
  const isMac = process.platform === 'darwin'
  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: APP_NAME,
          submenu: [
            { role: 'about', label: `À propos d’${APP_NAME}` },
            { type: 'separator' },
            { role: 'hide', label: `Masquer ${APP_NAME}` },
            { role: 'hideOthers', label: 'Masquer les autres' },
            { role: 'unhide', label: 'Tout afficher' },
            { type: 'separator' },
            { role: 'quit', label: `Quitter ${APP_NAME}` }
          ]
        }
      ]
    : []
  const quitItems: MenuItemConstructorOptions[] = isMac ? [] : [{ type: 'separator' }, { role: 'quit', label: 'Quitter' }]
  const template: MenuItemConstructorOptions[] = [
    ...appMenu,
    {
      label: 'Fichier',
      submenu: [
        { label: 'Nouveau projet', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: 'Ouvrir…', accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        { type: 'separator' },
        { label: 'Enregistrer', accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: 'Enregistrer sous…', accelerator: 'Shift+CmdOrCtrl+S', click: () => send('saveAs') },
        ...quitItems
      ]
    },
    {
      label: 'Édition',
      submenu: [
        { label: 'Annuler', accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
        { label: 'Rétablir', accelerator: 'Shift+CmdOrCtrl+Z', click: () => send('redo') },
        { type: 'separator' },
        { label: 'Rechercher un appareil…', accelerator: 'CmdOrCtrl+K', click: () => send('search') },
        { type: 'separator' },
        { role: 'cut', label: 'Couper' },
        { role: 'copy', label: 'Copier' },
        { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { label: 'Cadrer tout', accelerator: 'CmdOrCtrl+0', click: () => send('fitView') },
        { label: 'Zoom avant', accelerator: 'CmdOrCtrl+Plus', click: () => send('zoomIn') },
        { label: 'Zoom arrière', accelerator: 'CmdOrCtrl+-', click: () => send('zoomOut') },
        { type: 'separator' },
        { role: 'reload', label: 'Recharger' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
