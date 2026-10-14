import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions, type SaveDialogOptions } from 'electron'
import { IPC, type OpenedFile } from '../shared/api'
import { FILE_EXTENSION } from '../shared/appInfo'
import { join } from 'node:path'
import { existingRecent, readRecent, rememberRecent } from './recent'
import { assertRecentMember, createGrants } from './grants'
import { frenchErrors } from './errors'
import { atomicWriteFile, backupFile, readTextFile } from './fileIO'

const filters = [{ name: 'Projet AV·WAN', extensions: [FILE_EXTENSION] }]
const EXT = `.${FILE_EXTENSION}`

function assertProjectPath(path: string): void {
  if (!path.toLowerCase().endsWith(EXT)) throw new Error(`Extension attendue : ${EXT}`)
}

// Le renderer n'écrit et ne rouvre que des chemins accordés ici.
export const grants = createGrants()
const isE2E = (): boolean => process.env['AVWAN_E2E'] === '1'

const recentFile = (): string => join(app.getPath('userData'), 'recent.json')
// La liste des récents ne doit jamais faire échouer une ouverture ou un enregistrement.
const remember = (path: string): Promise<void> =>
  rememberRecent(recentFile(), path).then(
    () => undefined,
    () => undefined
  )

export function registerIpc(): void {
  ipcMain.handle(IPC.open, (event) =>
    frenchErrors(async (): Promise<OpenedFile | null> => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const options: OpenDialogOptions = { properties: ['openFile'], filters }
      const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
      const path = res.filePaths[0]
      if (res.canceled || !path) return null
      const text = await readTextFile(path)
      grants.grant(path)
      return { path, text }
    })
  )

  // Crochet de test : lecture directe d'un chemin, seulement quand l'app tourne en mode E2E.
  if (isE2E()) {
    ipcMain.handle(IPC.read, (_event, path: string) =>
      frenchErrors(async (): Promise<OpenedFile> => {
        assertProjectPath(path)
        grants.grant(path)
        return { path, text: await readTextFile(path) }
      })
    )
  }

  ipcMain.handle(IPC.save, (_event, path: string, text: string) =>
    frenchErrors(async (): Promise<string> => {
      assertProjectPath(path)
      if (isE2E()) grants.grant(path)
      grants.assertGranted(path)
      await atomicWriteFile(path, text)
      await remember(path)
      return path
    })
  )

  ipcMain.handle(IPC.saveAs, (event, text: string, suggestedName: string) =>
    frenchErrors(async (): Promise<string | null> => {
      const win = BrowserWindow.fromWebContents(event.sender)
      const options: SaveDialogOptions = {
        defaultPath: suggestedName.toLowerCase().endsWith(EXT) ? suggestedName : `${suggestedName}${EXT}`,
        filters
      }
      const res = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
      if (res.canceled || !res.filePath) return null
      const path = res.filePath.toLowerCase().endsWith(EXT) ? res.filePath : `${res.filePath}${EXT}`
      await atomicWriteFile(path, text)
      grants.grant(path)
      await remember(path)
      return path
    })
  )

  ipcMain.handle(IPC.recentList, (): Promise<string[]> => existingRecent(recentFile()))

  // Le renderer ne peut rouvrir que des chemins de la liste des récents.
  ipcMain.handle(IPC.recentOpen, (_event, path: string) =>
    frenchErrors(async (): Promise<OpenedFile> => {
      assertProjectPath(path)
      assertRecentMember(await readRecent(recentFile()), path)
      const text = await readTextFile(path)
      grants.grant(path)
      return { path, text }
    })
  )

  // Le renderer confirme qu'un fichier s'est ouvert correctement : seulement un chemin accordé ici.
  ipcMain.handle(IPC.recentRemember, (_event, path: string) =>
    frenchErrors(async () => {
      assertProjectPath(path)
      grants.assertGranted(path)
      await remember(path)
    })
  )

  ipcMain.handle(IPC.backup, (_event, path: string) =>
    frenchErrors(async (): Promise<string> => {
      assertProjectPath(path)
      grants.assertGranted(path)
      return backupFile(path)
    })
  )
}
