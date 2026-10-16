import type { PdfOptions } from '../../../shared/pdfOptions'
import type { Lang } from '../../../shared/i18n/lang'
import { projectStore } from '../store/projectStore'
import { printTextOf } from '../app/fileText'
import { suggestedName } from '../app/fileActions'
import { fileNameOf } from '../app/fileName'
import { ipcErrorMessage } from '../app/ipcError'
import { currentLang, currentMessages } from '../i18n/useT'
import { dataTables } from '../reports/dataTables'
import { loadDocLang } from './docLang'

// Les fichiers sont dans la langue des documents ; les messages (toasts) dans celle de l'interface.

// Le processus principal choisit le fichier, met en page dans une fenêtre cachée, puis écrit le PDF.
export async function exportPdfAction(options: PdfOptions): Promise<string | null> {
  const s = projectStore.getState()
  const t = currentMessages().export.toast
  s.showToast(t.preparing)
  try {
    const path = await window.avwan.export.pdf(printTextOf(s.history.present), options, suggestedName())
    if (path) projectStore.getState().showToast(t.pdfExported({ name: fileNameOf(path) }))
    else projectStore.getState().clearToast()
    return path
  } catch (e) {
    projectStore.getState().showToast(t.pdfFailed({ reason: ipcErrorMessage(e) }))
    return null
  }
}

// Les listes en CSV pour Excel, un fichier par liste (spec § 11.2) : « ; » et virgule en français, « , » et point en anglais.
export async function exportCsvAction(lang: Lang = loadDocLang(currentLang())): Promise<string[] | null> {
  const s = projectStore.getState()
  const t = currentMessages().export.toast
  try {
    const paths = await window.avwan.export.csv(dataTables(s.history.present, lang), suggestedName(), lang)
    if (paths) projectStore.getState().showToast(t.csvExported({ n: paths.length, names: paths.map(fileNameOf).join(', ') }))
    return paths
  } catch (e) {
    projectStore.getState().showToast(t.csvFailed({ reason: ipcErrorMessage(e) }))
    return null
  }
}

// Les listes dans un classeur Excel, une feuille par liste.
export async function exportXlsxAction(lang: Lang = loadDocLang(currentLang())): Promise<string | null> {
  const s = projectStore.getState()
  const t = currentMessages().export.toast
  try {
    const path = await window.avwan.export.xlsx(dataTables(s.history.present, lang), suggestedName(), lang)
    if (path) projectStore.getState().showToast(t.xlsxExported({ name: fileNameOf(path) }))
    return path
  } catch (e) {
    projectStore.getState().showToast(t.xlsxFailed({ reason: ipcErrorMessage(e) }))
    return null
  }
}
