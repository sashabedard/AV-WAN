import { BrowserWindow, ipcMain, Menu } from 'electron'
import { IPC } from '../shared/api'
import { TOP_BAR_HEIGHT, menuPosition, titleBarColors } from './windowChrome'

// La fenêtre n'a plus de barre de titre native : couleurs des boutons Windows (thème) et menu ☰.
export function registerWindowChromeIpc(): void {
  ipcMain.on(IPC.windowTitleBarColors, (event, value: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const colors = titleBarColors(value)
    if (!win || !colors || process.platform === 'darwin') return
    win.setTitleBarOverlay({ ...colors, height: TOP_BAR_HEIGHT })
  })
  ipcMain.on(IPC.windowShowMenu, (event, value: unknown) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const at = menuPosition(value)
    const menu = Menu.getApplicationMenu()
    if (!win || !at || !menu) return
    menu.popup({ window: win, x: at.x, y: at.y })
  })
}

// Plein écran macOS : les pastilles disparaissent, la barre de l'app récupère leur place.
export function followFullscreen(win: BrowserWindow): void {
  const send = (fullscreen: boolean) => (): void => {
    if (!win.isDestroyed()) win.webContents.send(IPC.windowFullscreen, fullscreen)
  }
  win.on('enter-full-screen', send(true))
  win.on('leave-full-screen', send(false))
}
