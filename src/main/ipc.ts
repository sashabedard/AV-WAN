import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions, type SaveDialogOptions } from 'electron'
import { IPC, type OpenedFile } from '../shared/api'
import { FILE_EXTENSION } from '../shared/appInfo'
import { join } from 'node:path'
import { existingRecent, readRecent, rememberRecent } from './recent'
import { atomicWriteFile, backupFile, readTextFile } from './fileIO'

const filters = [{ name: 'Projet AV·WAN', extensions: [FILE_EXTENSION] }]
const EXT = `.${FILE_EXTENSION}`

function assertProjectPath(path: string): void {
  if (!path.toLowerCase().endsWith(EXT)) throw new Error(`Extension attendue : ${EXT}`)
}

const recentFile = (): string => join(app.getPath('userData'), 'recent.json')
// La liste des récents ne doit jamais faire échouer une ouverture ou un enregistrement.
const remember = (path: string): Promise<void> =>
  rememberRecent(recentFile(), path).then(
    () => undefined,
    () => undefined
  )

export function registerIpc(): void {
  ipcMain.handle(IPC.open, async (event): Promise<OpenedFile | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: OpenDialogOptions = { properties: ['openFile'], filters }
    const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    const path = res.filePaths[0]
    if (res.canceled || !path) return null
    const text = await readTextFile(path)
    await remember(path)
    return { path, text }
  })

  ipcMain.handle(IPC.read, async (_event, path: string): Promise<OpenedFile> => {
    assertProjectPath(path)
    return { path, text: await readTextFile(path) }
  })

  ipcMain.handle(IPC.save, async (_event, path: string, text: string): Promise<string> => {
    assertProjectPath(path)
    await atomicWriteFile(path, text)
    await remember(path)
    return path
  })

  ipcMain.handle(IPC.saveAs, async (event, text: string, suggestedName: string): Promise<string | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: SaveDialogOptions = {
      defaultPath: suggestedName.toLowerCase().endsWith(EXT) ? suggestedName : `${suggestedName}${EXT}`,
      filters
    }
    const res = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (res.canceled || !res.filePath) return null
    const path = res.filePath.toLowerCase().endsWith(EXT) ? res.filePath : `${res.filePath}${EXT}`
    await atomicWriteFile(path, text)
    await remember(path)
    return path
  })

  ipcMain.handle(IPC.recentList, (): Promise<string[]> => existingRecent(recentFile()))

  // Le renderer ne peut rouvrir que des chemins de la liste des récents.
  ipcMain.handle(IPC.recentOpen, async (_event, path: string): Promise<OpenedFile> => {
    assertProjectPath(path)
    if (!(await readRecent(recentFile())).includes(path)) throw new Error('Ce fichier ne fait pas partie des fichiers récents.')
    const text = await readTextFile(path)
    await remember(path)
    return { path, text }
  })

  ipcMain.handle(IPC.backup, async (_event, path: string): Promise<string> => {
    assertProjectPath(path)
    return backupFile(path)
  })
}
