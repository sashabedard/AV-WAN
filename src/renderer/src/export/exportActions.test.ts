import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { projectStore } from '../store/projectStore'
import { sampleProject } from '../model/__fixtures__/sample'
import { serializeProject } from '../model/file'
import { defaultPdfOptions } from '../../../shared/pdfOptions'
import { dataTables } from '../reports/dataTables'
import { exportCsvAction, exportPdfAction, exportXlsxAction } from './exportActions'

beforeEach(() => projectStore.getState().loadProject(sampleProject(), '/x/lumen.avwan'))
afterEach(() => vi.unstubAllGlobals())

function withPdf(pdf: () => Promise<string | null>) {
  const api = { export: { pdf: vi.fn(pdf) } }
  vi.stubGlobal('window', { avwan: api })
  return api
}

describe('exportPdfAction', () => {
  it('envoie le projet et les options, puis annonce le fichier écrit', async () => {
    const api = withPdf(async () => '/x/Installation Lumen.pdf')
    const options = defaultPdfOptions('iso')
    expect(await exportPdfAction(options)).toBe('/x/Installation Lumen.pdf')
    expect(api.export.pdf).toHaveBeenCalledWith(serializeProject(sampleProject()), options, 'Installation Lumen')
    expect(projectStore.getState().toast).toBe('PDF exporté : Installation Lumen.pdf')
  })

  it('ne dit rien quand le dialogue est annulé', async () => {
    withPdf(async () => null)
    expect(await exportPdfAction(defaultPdfOptions())).toBeNull()
    expect(projectStore.getState().toast).toBeNull()
  })

  it('explique un échec en français, sans le préfixe IPC', async () => {
    withPdf(async () => Promise.reject(new Error("Error invoking remote method 'export:pdf': Error: Plus d’espace sur le disque (ENOSPC).")))
    expect(await exportPdfAction(defaultPdfOptions())).toBeNull()
    expect(projectStore.getState().toast).toBe('Échec de l’export PDF : Plus d’espace sur le disque (ENOSPC).')
  })
})

describe('exportCsvAction et exportXlsxAction', () => {
  function withData(csv: () => Promise<string[] | null>, xlsx: () => Promise<string | null>) {
    const api = { export: { csv: vi.fn(csv), xlsx: vi.fn(xlsx) } }
    vi.stubGlobal('window', { avwan: api })
    return api
  }

  it('envoie les trois listes et annonce les fichiers', async () => {
    const api = withData(async () => ['/x/a-branchement.csv', '/x/a-plan-ip.csv', '/x/a-nomenclature.csv'], async () => '/x/a.xlsx')
    await exportCsvAction()
    expect(api.export.csv).toHaveBeenCalledWith(dataTables(sampleProject()), 'Installation Lumen')
    expect(projectStore.getState().toast).toBe('3 fichiers CSV exportés : a-branchement.csv, a-plan-ip.csv, a-nomenclature.csv')
    await exportXlsxAction()
    expect(projectStore.getState().toast).toBe('Classeur Excel exporté : a.xlsx')
  })

  it('ne dit rien quand le dialogue est annulé, et explique un échec', async () => {
    withData(async () => null, async () => Promise.reject(new Error("Error invoking remote method 'export:xlsx': Error: Accès refusé (EACCES).")))
    projectStore.getState().clearToast()
    expect(await exportCsvAction()).toBeNull()
    expect(projectStore.getState().toast).toBeNull()
    expect(await exportXlsxAction()).toBeNull()
    expect(projectStore.getState().toast).toBe('Échec de l’export Excel : Accès refusé (EACCES).')
  })
})
