import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { IPC, type OpenRequest } from '../shared/api'
import { APP_NAME, APP_SUBTITLE, RELEASES_URL } from '../shared/appInfo'
import { discardLastRecoverySync, grants, registerIpc, resetRecoverySession } from './ipc'
import { buildMenu } from './menu'
import { loadRenderer } from './windows'
import { registerExportIpc } from './exports'
import { readTextFile } from './fileIO'
import { frenchFsMessage } from './errors'
import { checkForUpdatesManually, setupUpdater } from './updater'
import { createOpenQueue, pathsFromArgv } from './openRequests'

const userData = process.env['AVWAN_USER_DATA']
if (userData) app.setPath('userData', userData)
const isE2E = process.env['AVWAN_E2E'] === '1'
// En mode test, aucune fenêtre ni icône Dock ne doit apparaître à l'écran.
if (isE2E) app.dock?.hide()
// Icône d'app en développement ; une fois empaquetée, electron-builder fournit l'ICNS ou l'ICO.
const devIcon = join(__dirname, '../../build/icon.png')

// Une seule instance de l'app empaquetée : un double-clic sur un .avwan rejoint la fenêtre déjà ouverte.
// En développement et en e2e, chaque lancement a son propre userData et doit pouvoir démarrer.
const primary = !app.isPackaged || app.requestSingleInstanceLock()

let mainWindow: BrowserWindow | null = null

// Fichiers à ouvrir (double-clic, Dock, 2e instance) : ils attendent que l'interface soit prête.
const openQueue = createOpenQueue((path) => void deliverOpen(path))

async function deliverOpen(path: string): Promise<void> {
  const win = mainWindow
  if (!win || win.isDestroyed()) return
  let request: OpenRequest
  try {
    const text = await readTextFile(path)
    // Le double-clic dans le Finder ou l'Explorateur vaut consentement : ⌘S pourra écrire ce fichier.
    grants.grant(path)
    request = { path, text }
  } catch (e) {
    request = { path, error: frenchFsMessage(e) }
  }
  if (!win.isDestroyed()) win.webContents.send(IPC.openRequest, request)
}

function bringToFront(win: BrowserWindow): void {
  if (isE2E) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function requestOpen(paths: readonly string[]): void {
  if (paths.length === 0) return
  for (const path of paths) openQueue.push(path)
  if (!app.isReady()) return
  if (!mainWindow || mainWindow.isDestroyed()) createWindow()
  else bringToFront(mainWindow)
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#15181B',
    title: 'AV·WAN',
    ...(app.isPackaged ? {} : { icon: devIcon }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: !isE2E
    }
  })
  mainWindow = win
  openQueue.reset()
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
    openQueue.reset()
  })
  // Une navigation validée (premier chargement, rechargement du menu Affichage) ou un plantage du rendu
  // oblige l'interface à signaler de nouveau qu'elle est prête ; un rechargement annulé ne change rien.
  // Le rechargement garde le même webContents : on lève aussi l'abandon de « Quitter sans enregistrer ».
  win.webContents.on('did-navigate', () => {
    openQueue.reset()
    resetRecoverySession(win.webContents.id)
  })
  win.webContents.on('render-process-gone', () => openQueue.reset())
  if (!isE2E) win.once('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })
  // L'app ne navigue jamais (un fichier lâché sur la fenêtre la remplacerait sinon).
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  // Le renderer pose onbeforeunload quand le projet est modifié ; on demande ici.
  win.webContents.on('will-prevent-unload', (event) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'question',
      buttons: ['Quitter sans enregistrer', 'Annuler'],
      defaultId: 1,
      cancelId: 1,
      message: 'Des modifications ne sont pas enregistrées.',
      detail: 'Elles seront perdues si vous quittez maintenant.'
    })
    if (choice === 0) {
      // Abandon volontaire : la copie de récupération de cette fenêtre ne doit pas être proposée au prochain lancement.
      discardLastRecoverySync(win.webContents.id)
      event.preventDefault()
    }
  })
  void loadRenderer(win)
  return win
}

// « À propos » sous Windows : macOS a le panneau natif du menu de l'app.
function showAbout(): void {
  const options = { type: 'info' as const, title: `À propos d’${APP_NAME}`, message: APP_NAME, detail: `${APP_SUBTITLE}\nVersion ${app.getVersion()}`, buttons: ['OK'] }
  const win = BrowserWindow.getFocusedWindow()
  void (win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options))
}

if (!primary) {
  // Une autre instance tourne déjà : elle a reçu notre argv (second-instance).
  app.quit()
} else {
  // macOS : double-clic, ou fichier lâché sur l'icône du Dock. Peut arriver avant « ready ».
  app.on('open-file', (event, path) => {
    event.preventDefault()
    requestOpen(pathsFromArgv([path]))
  })
  // Windows : un double-clic quand l'app est déjà ouverte lance une 2e instance, qui nous passe son argv.
  app.on('second-instance', (_event, argv) => {
    const paths = pathsFromArgv(argv.slice(1))
    if (paths.length > 0) requestOpen(paths)
    else if (mainWindow) bringToFront(mainWindow)
  })
  // Windows : l'app lancée par un double-clic reçoit le chemin dans son argv.
  if (process.platform !== 'darwin') for (const path of pathsFromArgv(process.argv.slice(1))) openQueue.push(path)

  ipcMain.on(IPC.rendererReady, (event) => {
    if (mainWindow && event.sender === mainWindow.webContents) openQueue.ready()
  })

  void app.whenReady().then(() => {
    if (process.platform === 'darwin' && !app.isPackaged && !isE2E) app.dock?.setIcon(devIcon)
    registerIpc()
    registerExportIpc()
    setupUpdater(isE2E)
    app.setAboutPanelOptions({ applicationName: APP_NAME, applicationVersion: app.getVersion(), version: '', credits: APP_SUBTITLE })
    buildMenu({
      about: showAbout,
      checkUpdates: () => void checkForUpdatesManually(BrowserWindow.getFocusedWindow()),
      releases: () => void shell.openExternal(RELEASES_URL)
    })
    createWindow()
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
