import type { PdfOptions } from '../../../shared/pdfOptions'
import { projectStore } from '../store/projectStore'
import { printTextOf } from '../app/fileText'
import { suggestedName } from '../app/fileActions'
import { fileNameOf } from '../app/fileName'
import { ipcErrorMessage } from '../app/ipcError'
import { dataTables } from '../reports/dataTables'

// Le processus principal choisit le fichier, met en page dans une fenêtre cachée, puis écrit le PDF.
export async function exportPdfAction(options: PdfOptions): Promise<string | null> {
  const s = projectStore.getState()
  s.showToast('Préparation du PDF…')
  try {
    const path = await window.avwan.export.pdf(printTextOf(s.history.present), options, suggestedName())
    if (path) projectStore.getState().showToast(`PDF exporté : ${fileNameOf(path)}`)
    else projectStore.getState().clearToast()
    return path
  } catch (e) {
    projectStore.getState().showToast(`Échec de l’export PDF : ${ipcErrorMessage(e)}`)
    return null
  }
}

// Les trois listes en CSV pour Excel en français, un fichier par liste (spec § 11.2).
export async function exportCsvAction(): Promise<string[] | null> {
  const s = projectStore.getState()
  try {
    const paths = await window.avwan.export.csv(dataTables(s.history.present), suggestedName())
    if (paths) projectStore.getState().showToast(`${paths.length} fichiers CSV exportés : ${paths.map(fileNameOf).join(', ')}`)
    return paths
  } catch (e) {
    projectStore.getState().showToast(`Échec de l’export CSV : ${ipcErrorMessage(e)}`)
    return null
  }
}

// Les trois listes dans un classeur Excel, une feuille par liste.
export async function exportXlsxAction(): Promise<string | null> {
  const s = projectStore.getState()
  try {
    const path = await window.avwan.export.xlsx(dataTables(s.history.present), suggestedName())
    if (path) projectStore.getState().showToast(`Classeur Excel exporté : ${fileNameOf(path)}`)
    return path
  } catch (e) {
    projectStore.getState().showToast(`Échec de l’export Excel : ${ipcErrorMessage(e)}`)
    return null
  }
}
