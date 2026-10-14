import { app, BrowserWindow, dialog, shell } from 'electron'
import { APP_NAME, APP_SUBTITLE, RELEASES_URL } from '../shared/appInfo'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { buildMenu } from './menu'
import { loadRenderer } from './windows'
import { registerExportIpc } from './exports'

const userData = process.env['AVWAN_USER_DATA']
if (userData) app.setPath('userData', userData)
const isE2E = process.env['AVWAN_E2E'] === '1'
// En mode test, aucune fenêtre ni icône Dock ne doit apparaître à l'écran.
if (isE2E) app.dock?.hide()
// Icône d'app en développement ; une fois empaquetée, electron-builder fournit l'ICNS ou l'ICO (plan 4).
const devIcon = join(__dirname, '../../build/icon.png')

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
    if (choice === 0) event.preventDefault()
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

void app.whenReady().then(() => {
  if (process.platform === 'darwin' && !app.isPackaged && !isE2E) app.dock?.setIcon(devIcon)
  registerIpc()
  registerExportIpc()
  app.setAboutPanelOptions({ applicationName: APP_NAME, applicationVersion: app.getVersion(), version: '', credits: APP_SUBTITLE })
  buildMenu({ about: showAbout, releases: () => void shell.openExternal(RELEASES_URL) })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
