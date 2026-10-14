import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type AvwanApi, type MenuAction } from '../shared/api'

const api: AvwanApi = {
  platform: process.platform,
  isE2E: process.env['AVWAN_E2E'] === '1',
  file: {
    open: () => ipcRenderer.invoke(IPC.open),
    read: (path) => ipcRenderer.invoke(IPC.read, path),
    save: (path, text) => ipcRenderer.invoke(IPC.save, path, text),
    saveAs: (text, suggestedName) => ipcRenderer.invoke(IPC.saveAs, text, suggestedName),
    backup: (path) => ipcRenderer.invoke(IPC.backup, path)
  },
  onMenu: (callback) => {
    const handler = (_event: IpcRendererEvent, action: MenuAction): void => callback(action)
    ipcRenderer.on(IPC.menu, handler)
    return () => {
      ipcRenderer.removeListener(IPC.menu, handler)
    }
  }
}

contextBridge.exposeInMainWorld('avwan', api)
