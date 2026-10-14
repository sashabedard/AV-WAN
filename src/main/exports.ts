import { BrowserWindow, dialog, ipcMain, type SaveDialogOptions } from 'electron'
import { join } from 'node:path'
import { IPC } from '../shared/api'
import type { PdfOptions } from '../shared/pdfOptions'
import { atomicWriteFile } from './fileIO'
import { frenchErrors } from './errors'
import { EXPORT_FILTERS, safeFileName, withExtension, type ExportKind } from './exportPaths'
import { registerPrintIpc, renderPdf } from './printPdf'

// Chemin choisi par l'utilisateur dans un dialogue système. En test seulement (AVWAN_E2E=1),
// un dossier imposé remplace le dialogue : le renderer ne passe jamais de chemin.
export async function chooseExportPath(win: BrowserWindow | null, kind: ExportKind, suggestedName: string): Promise<string | null> {
  const name = withExtension(safeFileName(suggestedName), kind)
  const testDir = process.env['AVWAN_E2E'] === '1' ? process.env['AVWAN_E2E_EXPORT_DIR'] : undefined
  if (testDir) return join(testDir, name)
  const options: SaveDialogOptions = { defaultPath: name, filters: [EXPORT_FILTERS[kind]] }
  const res = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
  if (res.canceled || !res.filePath) return null
  return withExtension(res.filePath, kind)
}

export function registerExportIpc(): void {
  registerPrintIpc()
  ipcMain.handle(IPC.exportPdf, (event, projectText: unknown, options: PdfOptions, suggestedName: unknown) =>
    frenchErrors(async () => {
      const target = await chooseExportPath(BrowserWindow.fromWebContents(event.sender), 'pdf', String(suggestedName))
      if (!target) return null
      const pdf = await renderPdf({ projectText: String(projectText), options })
      await atomicWriteFile(target, pdf)
      return target
    })
  )
}
