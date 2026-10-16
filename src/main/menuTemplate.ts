import type { MenuItemConstructorOptions } from 'electron'
import type { MenuAction } from '../shared/api'
import { APP_NAME } from '../shared/appInfo'
import { mainMessages } from './lang'

// Actions du menu Aide, fournies par le processus principal (boîtes de dialogue, navigateur).
export interface HelpHandlers {
  about(): void
  checkUpdates(): void
  releases(): void
}

// Réglages exposés dans le menu Fichier (case à cocher native).
export interface FileMenuOptions {
  autoSave: boolean
  toggleAutoSave(on: boolean): void
}

const SEPARATOR: MenuItemConstructorOptions = { type: 'separator' }

// Gabarit du menu, sans Electron à l'exécution : testable sous Vitest.
export function menuTemplate(isMac: boolean, send: (action: MenuAction) => void, help: HelpHandlers, file: FileMenuOptions): MenuItemConstructorOptions[] {
  const m = mainMessages().menu
  const appMenu: MenuItemConstructorOptions[] = isMac
    ? [
        {
          label: APP_NAME,
          submenu: [
            { role: 'about', label: m.about({ app: APP_NAME }) },
            SEPARATOR,
            { role: 'hide', label: m.hide({ app: APP_NAME }) },
            { role: 'hideOthers', label: m.hideOthers },
            { role: 'unhide', label: m.unhide },
            SEPARATOR,
            { role: 'quit', label: m.quitApp({ app: APP_NAME }) }
          ]
        }
      ]
    : []
  const quitItems: MenuItemConstructorOptions[] = isMac ? [] : [SEPARATOR, { role: 'quit', label: m.quit }]
  const helpItems: MenuItemConstructorOptions[] = [
    ...(isMac ? [] : [{ label: m.about({ app: APP_NAME }), click: () => help.about() }, SEPARATOR]),
    { label: m.checkUpdates, click: () => help.checkUpdates() },
    { label: m.releases, click: () => help.releases() }
  ]
  return [
    ...appMenu,
    {
      label: m.file,
      submenu: [
        { label: m.newProject, accelerator: 'CmdOrCtrl+N', click: () => send('new') },
        { label: m.open, accelerator: 'CmdOrCtrl+O', click: () => send('open') },
        SEPARATOR,
        { label: m.save, accelerator: 'CmdOrCtrl+S', click: () => send('save') },
        { label: m.saveAs, accelerator: 'Shift+CmdOrCtrl+S', click: () => send('saveAs') },
        { label: m.autoSave, type: 'checkbox', checked: file.autoSave, click: (item) => file.toggleAutoSave(item.checked) },
        { label: m.revertToOpened, click: () => send('revertToOpened') },
        SEPARATOR,
        { label: m.exportPdf, accelerator: 'CmdOrCtrl+E', click: () => send('exportPdf') },
        { label: m.exportCsv, click: () => send('exportCsv') },
        { label: m.exportXlsx, click: () => send('exportXlsx') },
        ...quitItems
      ]
    },
    {
      label: m.edit,
      submenu: [
        { label: m.undo, accelerator: 'CmdOrCtrl+Z', click: () => send('undo') },
        { label: m.redo, accelerator: 'Shift+CmdOrCtrl+Z', click: () => send('redo') },
        SEPARATOR,
        { label: m.searchDevice, accelerator: 'CmdOrCtrl+K', click: () => send('search') },
        SEPARATOR,
        { role: 'cut', label: m.cut },
        { role: 'copy', label: m.copy },
        { role: 'paste', label: m.paste },
        { label: m.duplicate, accelerator: 'CmdOrCtrl+D', click: () => send('duplicate') },
        { label: m.groupZone, accelerator: 'CmdOrCtrl+G', click: () => send('groupZone') },
        { role: 'selectAll', label: m.selectAll }
      ]
    },
    {
      label: m.view,
      submenu: [
        { label: m.fitView, accelerator: 'CmdOrCtrl+0', click: () => send('fitView') },
        { label: m.zoomIn, accelerator: 'CmdOrCtrl+Plus', click: () => send('zoomIn') },
        { label: m.zoomOut, accelerator: 'CmdOrCtrl+-', click: () => send('zoomOut') },
        SEPARATOR,
        { label: m.pinView, accelerator: 'Shift+CmdOrCtrl+P', click: () => send('pinView') },
        { label: m.unpinView, click: () => send('unpinView') },
        SEPARATOR,
        { role: 'reload', label: m.reload },
        { role: 'toggleDevTools', label: m.devTools },
        SEPARATOR,
        { role: 'togglefullscreen', label: m.fullscreen }
      ]
    },
    { label: m.help, role: 'help', submenu: helpItems }
  ]
}
