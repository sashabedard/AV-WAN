import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC } from '../shared/api'
import { manualCheckMessage, updateErrorMessage, type ManualCheck } from './updateMessages'

const FIRST_CHECK_MS = 10_000
const CHECK_EVERY_MS = 4 * 60 * 60 * 1000

let enabled = false
let readyVersion: string | null = null

function broadcastReady(version: string): void {
  for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.webContents.send(IPC.updateReady, version)
}

// Mises à jour depuis les releases GitHub publiées (les brouillons sont ignorés). Seulement dans l'app
// empaquetée : jamais en développement ni en e2e. Les vérifications de fond sont muettes, même en erreur.
export function setupUpdater(isE2E: boolean): void {
  ipcMain.handle(IPC.updatePending, () => readyVersion)
  ipcMain.on(IPC.updateInstall, () => {
    // La fermeture passe par la question sur les modifications non enregistrées (will-prevent-unload).
    if (readyVersion) autoUpdater.quitAndInstall()
  })
  if (!app.isPackaged || isE2E) return
  enabled = true
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = null
  autoUpdater.on('update-downloaded', (info) => {
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
  if (!enabled) result = { kind: 'not-packaged' }
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
