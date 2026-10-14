import { BrowserWindow, Menu } from 'electron'
import { IPC, type MenuAction } from '../shared/api'
import { menuTemplate, type HelpHandlers } from './menuTemplate'

function send(action: MenuAction): void {
  BrowserWindow.getFocusedWindow()?.webContents.send(IPC.menu, action)
}

export function buildMenu(help: HelpHandlers): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate(process.platform === 'darwin', send, help)))
}
