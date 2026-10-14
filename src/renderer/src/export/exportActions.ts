import type { PdfOptions } from '../../../shared/pdfOptions'
import { projectStore } from '../store/projectStore'
import { serializeProject } from '../model/file'
import { fileNameOf, suggestedName } from '../app/fileActions'
import { ipcErrorMessage } from '../app/ipcError'

// Le processus principal choisit le fichier, met en page dans une fenêtre cachée, puis écrit le PDF.
export async function exportPdfAction(options: PdfOptions): Promise<string | null> {
  const s = projectStore.getState()
  s.showToast('Préparation du PDF…')
  try {
    const path = await window.avwan.export.pdf(serializeProject(s.history.present), options, suggestedName())
    if (path) projectStore.getState().showToast(`PDF exporté : ${fileNameOf(path)}`)
    else projectStore.getState().clearToast()
    return path
  } catch (e) {
    projectStore.getState().showToast(`Échec de l’export PDF : ${ipcErrorMessage(e)}`)
    return null
  }
}
