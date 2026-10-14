import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type AvwanApi, type MenuAction, type OpenRequest } from '../shared/api'

const api: AvwanApi = {
  platform: process.platform,
  isE2E: process.env['AVWAN_E2E'] === '1',
  autosaveMs: Number(process.env['AVWAN_AUTOSAVE_MS']) || 30_000,
  file: {
    open: () => ipcRenderer.invoke(IPC.open),
    read: (path) => ipcRenderer.invoke(IPC.read, path),
    save: (path, text) => ipcRenderer.invoke(IPC.save, path, text),
    saveAs: (text, suggestedName) => ipcRenderer.invoke(IPC.saveAs, text, suggestedName),
    backup: (path) => ipcRenderer.invoke(IPC.backup, path)
  },
  recent: {
    list: () => ipcRenderer.invoke(IPC.recentList),
    open: (path) => ipcRenderer.invoke(IPC.recentOpen, path),
    remember: (path) => ipcRenderer.invoke(IPC.recentRemember, path)
  },
  recovery: {
    write: (doc) => ipcRenderer.invoke(IPC.recoveryWrite, doc),
    discard: (key) => ipcRenderer.invoke(IPC.recoveryDiscard, key),
    list: () => ipcRenderer.invoke(IPC.recoveryList),
    restore: (key) => ipcRenderer.invoke(IPC.recoveryRestore, key),
    findNewer: (path) => ipcRenderer.invoke(IPC.recoveryFindNewer, path)
  },
  export: {
    pdf: (projectText, options, suggestedName) => ipcRenderer.invoke(IPC.exportPdf, projectText, options, suggestedName),
    csv: (tables, suggestedName) => ipcRenderer.invoke(IPC.exportCsv, tables, suggestedName),
    xlsx: (tables, suggestedName) => ipcRenderer.invoke(IPC.exportXlsx, tables, suggestedName)
  },
  print: {
    job: () => ipcRenderer.invoke(IPC.printJob),
    ready: () => ipcRenderer.send(IPC.printReady),
    failed: (message) => ipcRenderer.send(IPC.printFailed, message)
  },
  onMenu: (callback) => {
    const handler = (_event: IpcRendererEvent, action: MenuAction): void => callback(action)
    ipcRenderer.on(IPC.menu, handler)
    return () => {
      ipcRenderer.removeListener(IPC.menu, handler)
    }
  },
  onOpenRequest: (callback) => {
    const handler = (_event: IpcRendererEvent, request: OpenRequest): void => callback(request)
    ipcRenderer.on(IPC.openRequest, handler)
    return () => {
      ipcRenderer.removeListener(IPC.openRequest, handler)
    }
  },
  rendererReady: () => ipcRenderer.send(IPC.rendererReady)
}

contextBridge.exposeInMainWorld('avwan', api)
