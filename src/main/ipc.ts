import { app, BrowserWindow, dialog, ipcMain, type OpenDialogOptions, type SaveDialogOptions } from 'electron'
import { IPC, type LibraryFile, type OpenedFile, type RecoveryEntry, type RestoredRecovery } from '../shared/api'
import { FILE_EXTENSION } from '../shared/appInfo'
import { existsSync, promises as fs } from 'node:fs'
import { join } from 'node:path'
import { existingRecent, readRecent, rememberRecent } from './recent'
import { assertRecentMember, createGrants } from './grants'
import { frenchErrors, frenchFsMessage } from './errors'
import { uniqueProjectPath } from './defaultLocation'
import { atomicWriteFile, atomicWriteFileSync, backupFile, readTextFile } from './fileIO'
import { discardRecovery, discardRecoverySync, findNewerRecovery, isRecoveryKey, keyForPath, keyForUntitled, listRecovery, parseRecoveryWrite, prepareRestore, writeRecovery } from './recovery'
import { listLibrary, removeLibrary, saveLibrary } from './library'

const filters = [{ name: 'Projet AV·WAN', extensions: [FILE_EXTENSION] }]
const EXT = `.${FILE_EXTENSION}`

function assertProjectPath(path: string): void {
  if (!path.toLowerCase().endsWith(EXT)) throw new Error(`Extension attendue : ${EXT}`)
}

// Le renderer n'écrit et ne rouvre que des chemins accordés ici.
export const grants = createGrants()
const isE2E = (): boolean => process.env['AVWAN_E2E'] === '1'

// Fichiers créés par l'app dans Documents pendant la session (seuls ceux-là peuvent être supprimés).
const autoCreated = new Set<string>()
const documentsDir = (): string => (isE2E() && process.env['AVWAN_E2E_DOCUMENTS_DIR']) || join(app.getPath('documents'), 'AV·WAN')

const recentFile = (): string => join(app.getPath('userData'), 'recent.json')
// La liste des récents ne doit jamais faire échouer une ouverture ou un enregistrement.
const remember = (path: string): Promise<void> =>
  rememberRecent(recentFile(), path).then(
    () => undefined,
    () => undefined
  )

const recoveryDir = (): string => join(app.getPath('userData'), 'recovery')
const libraryDir = (): string => join(app.getPath('userData'), 'library')
// Dernière copie écrite par chaque fenêtre, pour « Quitter sans enregistrer ».
const lastRecoveryKey = new Map<number, string>()
// Fenêtres dont l'utilisateur a abandonné le travail : une écriture tardive (perte de focus) est ignorée.
const closedSenders = new Set<number>()

export function discardLastRecoverySync(webContentsId: number): void {
  closedSenders.add(webContentsId)
  const key = lastRecoveryKey.get(webContentsId)
  if (!key) return
  lastRecoveryKey.delete(webContentsId)
  try {
    discardRecoverySync(recoveryDir(), key)
  } catch {
    // l'app se ferme : une copie restée là sera proposée au prochain lancement
  }
}

// Un rechargement garde le même webContents : la fenêtre doit pouvoir écrire de nouveau des copies.
export function resetRecoverySession(webContentsId: number): void {
  closedSenders.delete(webContentsId)
  lastRecoveryKey.delete(webContentsId)
}

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

  ipcMain.handle(IPC.fileCreateDefault, (_event, title: unknown, text: unknown) =>
    frenchErrors(async (): Promise<string> => {
      if (typeof text !== 'string') throw new Error('Contenu du projet invalide.')
      const dir = documentsDir()
      await fs.mkdir(dir, { recursive: true })
      const path = uniqueProjectPath(dir, typeof title === 'string' ? title : '', existsSync)
      await atomicWriteFile(path, text)
      grants.grant(path)
      autoCreated.add(path)
      await remember(path)
      return path
    })
  )

  // Écriture synchrone (fermeture de la fenêtre) : le renderer attend toujours une réponse.
  ipcMain.on(IPC.fileSaveSync, (event, path: unknown, text: unknown) => {
    try {
      if (typeof path !== 'string' || typeof text !== 'string') throw new Error('Requête d’enregistrement invalide.')
      assertProjectPath(path)
      if (isE2E()) grants.grant(path)
      grants.assertGranted(path)
      atomicWriteFileSync(path, text)
      event.returnValue = { ok: true }
    } catch (e) {
      event.returnValue = { ok: false, error: frenchFsMessage(e) }
    }
  })

  ipcMain.handle(IPC.fileDiscardAutoCreated, (_event, path: unknown) =>
    frenchErrors(async (): Promise<void> => {
      if (typeof path === 'string' && autoCreated.has(path)) {
        autoCreated.delete(path)
        await fs.rm(path, { force: true })
      }
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

  // Le processus principal choisit la clé : un chemin n'est retenu que s'il a été accordé.
  ipcMain.handle(IPC.recoveryWrite, (event, payload: unknown) =>
    frenchErrors(async (): Promise<string> => {
      const doc = parseRecoveryWrite(payload)
      const path = doc.path !== null && grants.isGranted(doc.path) ? doc.path : null
      const key = path ? keyForPath(path) : keyForUntitled(doc.untitledId)
      if (closedSenders.has(event.sender.id)) return key
      await writeRecovery(recoveryDir(), key, { version: 1, path, title: doc.title, savedAt: new Date().toISOString(), text: doc.text })
      // Abandon survenu pendant l'écriture : la copie qui vient d'atterrir ne doit pas survivre.
      if (closedSenders.has(event.sender.id)) {
        await discardRecovery(recoveryDir(), key)
        return key
      }
      lastRecoveryKey.set(event.sender.id, key)
      return key
    })
  )

  ipcMain.handle(IPC.recoveryDiscard, (event, key: unknown) =>
    frenchErrors(async () => {
      if (!isRecoveryKey(key)) return
      await discardRecovery(recoveryDir(), key)
      if (lastRecoveryKey.get(event.sender.id) === key) lastRecoveryKey.delete(event.sender.id)
    })
  )

  ipcMain.handle(IPC.recoveryList, () => frenchErrors((): Promise<RecoveryEntry[]> => listRecovery(recoveryDir())))

  ipcMain.handle(IPC.recoveryRestore, (event, key: unknown) =>
    frenchErrors(async (): Promise<RestoredRecovery> => {
      if (!isRecoveryKey(key)) throw new Error('Clé de récupération invalide.')
      const restored = await prepareRestore(recoveryDir(), key)
      if (!restored) throw new Error('Cette copie de récupération n’existe plus.')
      if (restored.path) grants.grant(restored.path)
      // Quitter sans enregistrer juste après la restauration doit aussi effacer cette copie.
      lastRecoveryKey.set(event.sender.id, key)
      return restored
    })
  )

  // Seulement pour un chemin déjà accordé (dialogue, récents, double-clic).
  ipcMain.handle(IPC.recoveryFindNewer, (_event, path: unknown) =>
    frenchErrors(async (): Promise<RecoveryEntry | null> =>
      typeof path === 'string' && grants.isGranted(path) ? findNewerRecovery(recoveryDir(), path) : null
    )
  )
  ipcMain.handle(IPC.libraryList, (): Promise<LibraryFile[]> => listLibrary(libraryDir()))
  ipcMain.handle(IPC.librarySave, (_event, id: unknown, text: unknown) => frenchErrors(() => saveLibrary(libraryDir(), id, text)))
  ipcMain.handle(IPC.libraryRemove, (_event, id: unknown) => frenchErrors(() => removeLibrary(libraryDir(), id)))
}
