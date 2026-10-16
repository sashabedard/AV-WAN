import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC } from '../shared/api'
import { manualCheckMessage, updateErrorMessage, type ManualCheck } from './updateMessages'

const FIRST_CHECK_MS = 10_000
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000

let enabled = false
let readyVersion: string | null = null
let installRequested = false

// « Annuler » dans la question sur les modifications non enregistrées : on n'installe plus à la fermeture.
export function cancelInstallRequest(): void {
  installRequested = false
}

function broadcastReady(version: string): void {
  for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.webContents.send(IPC.updateReady, version)
}

// Mises à jour depuis les releases GitHub publiées (les brouillons sont ignorés). Seulement dans l'app
// empaquetée : jamais en développement ni en e2e. Les vérifications de fond sont muettes, même en erreur.
export function setupUpdater(isE2E: boolean): void {
  ipcMain.handle(IPC.updatePending, () => readyVersion)
  ipcMain.on(IPC.updateInstall, () => {
    // La fermeture passe par la question sur les modifications non enregistrées (will-prevent-unload).
    if (!readyVersion) return
    installRequested = true
    app.quit()
  })
  // Toutes les fenêtres ont accepté de se fermer : on peut lancer l'installeur et relancer l'app.
  app.on('will-quit', (event) => {
    if (!installRequested) return
    installRequested = false
    event.preventDefault()
    autoUpdater.quitAndInstall(false, true)
  })
  if (!app.isPackaged || isE2E) return
  // Paquet du Microsoft Store (MSIX, en lecture seule) : le Store installe lui-même les nouvelles versions.
  if (process.windowsStore) return
  enabled = true
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null
  autoUpdater.on('update-downloaded', (info) => {
    // Une vérification de fond peut ré-émettre l'événement pour une version déjà annoncée : le bandeau masqué ne doit pas revenir.
    if (readyVersion === info.version) return
    readyVersion = info.version
    broadcastReady(info.version)
  })
  // Sans écouteur, une erreur d'EventEmitter ferait planter le processus principal.
  autoUpdater.on('error', () => undefined)
  const check = (): void => void autoUpdater.checkForUpdates().catch(() => undefined)
  setTimeout(check, FIRST_CHECK_MS)
  setInterval(check, CHECK_EVERY_MS)
}

export async function checkForUpdatesManually(win: BrowserWindow | null): Promise<void> {
  let result: ManualCheck
  if (process.windowsStore) result = { kind: 'store' }
  else if (!enabled) result = { kind: 'not-packaged' }
  else if (readyVersion) result = { kind: 'ready', version: readyVersion }
  else {
    try {
      const r = await autoUpdater.checkForUpdates()
      result = r?.isUpdateAvailable ? { kind: 'downloading', version: r.updateInfo.version } : { kind: 'up-to-date', current: app.getVersion() }
    } catch (e) {
      result = { kind: 'error', message: updateErrorMessage(e) }
    }
  }
  const { message, detail } = manualCheckMessage(result)
  const options = { type: 'info' as const, buttons: ['OK'], message, ...(detail ? { detail } : {}) }
  await (win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options))
}
