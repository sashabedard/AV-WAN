import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { IPC, type PrintJob } from '../shared/api'
import { loadRenderer } from './windows'

const PRINT_TIMEOUT_MS = 60_000

interface Pending {
  job: PrintJob
  settle(error?: Error): void
}

// Une fenêtre d'impression par export en cours, retrouvée par son webContents.
const pending = new Map<number, Pending>()

export function registerPrintIpc(): void {
  ipcMain.handle(IPC.printJob, (event): PrintJob => {
    const p = pending.get(event.sender.id)
    if (!p) throw new Error('Aucune impression en cours pour cette fenêtre.')
    return p.job
  })
  ipcMain.on(IPC.printReady, (event) => pending.get(event.sender.id)?.settle())
  ipcMain.on(IPC.printFailed, (event, message: unknown) =>
    pending.get(event.sender.id)?.settle(new Error(`Mise en page du PDF impossible : ${String(message)}`))
  )
}

// Rend le projet dans une fenêtre jamais affichée, puis l'imprime en PDF vectoriel (spec § 11.1).
// La fenêtre est toujours détruite, même après un échec ou un délai dépassé.
export async function renderPdf(job: PrintJob, timeoutMs = PRINT_TIMEOUT_MS): Promise<Buffer> {
  const win = new BrowserWindow({
    show: false,
    width: 1700,
    height: 1100,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false
    }
  })
  const id = win.webContents.id
  let timer: NodeJS.Timeout | undefined
  const ready = new Promise<void>((resolve, reject) => {
    timer = setTimeout(() => reject(new Error('La mise en page du PDF a pris trop de temps.')), timeoutMs)
    pending.set(id, { job, settle: (error) => (error ? reject(error) : resolve()) })
  })
  ready.catch(() => undefined) // un échec avant l'attente (chargement) ne doit pas devenir un rejet non géré
  try {
    win.webContents.on('will-navigate', (e) => e.preventDefault())
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('render-process-gone', () => pending.get(id)?.settle(new Error('La fenêtre d’impression s’est arrêtée.')))
    await Promise.race([loadRenderer(win, { print: '1' }), ready])
    await ready
    return await win.webContents.printToPDF({ preferCSSPageSize: true, printBackground: true })
  } finally {
    clearTimeout(timer)
    pending.delete(id)
    win.destroy()
  }
}
