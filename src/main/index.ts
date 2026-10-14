import { app, BrowserWindow, dialog, shell } from 'electron'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { buildMenu } from './menu'

const userData = process.env['AVWAN_USER_DATA']
if (userData) app.setPath('userData', userData)
const isE2E = process.env['AVWAN_E2E'] === '1'
// En mode test, aucune fenêtre ni icône Dock ne doit apparaître à l'écran.
if (isE2E) app.dock?.hide()

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    show: false,
    backgroundColor: '#15181B',
    title: 'AV·WAN',
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
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) void win.loadURL(devUrl)
  else void win.loadFile(join(__dirname, '../renderer/index.html'))
  return win
}

void app.whenReady().then(() => {
  registerIpc()
  buildMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
