// src/renderer/src/export/ExportDialog.tsx
import { useState } from 'react'
import { PDF_SECTION_IDS, defaultPdfOptions, pdfSectionLabel, type PdfFormat, type PdfOptions, type PdfSection } from '../../../shared/pdfOptions'
import type { Lang } from '../../../shared/i18n/lang'
import { projectStore, useProject } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { Segmented } from '../panels/Segmented'
import { useT } from '../i18n/useT'
import { loadDocLang, saveDocLang } from './docLang'
import { exportCsvAction, exportPdfAction, exportXlsxAction } from './exportActions'
import './export.css'

const ALL_SECTIONS = PDF_SECTION_IDS
const DOC_LANGS: ReadonlyArray<{ value: Lang; label: string }> = [
  { value: 'fr', label: 'FR' },
  { value: 'en', label: 'EN' }
]

interface Props {
  onExport?: (options: PdfOptions) => unknown
  onCsv?: (lang: Lang) => unknown
  onXlsx?: (lang: Lang) => unknown
}

// Boîte « Exporter » (spec § 11) : le PDF (sections, format, pages de zone), ou les listes en CSV et en Excel.
export function ExportDialog({ onExport = exportPdfAction, onCsv = exportCsvAction, onXlsx = exportXlsxAction }: Props) {
  const open = useUiStore((s) => s.exportOpen)
  return open ? <ExportForm onExport={onExport} onCsv={onCsv} onXlsx={onXlsx} /> : null
}

function ExportForm({ onExport, onCsv, onXlsx }: Required<Props>) {
  const { m, lang } = useT()
  const t = m.export.dialog
  const formats = (['na', 'iso'] as const).map((value) => ({ value, label: m.export.formats[value] }))
  const project = useProject()
  const last = useUiStore((s) => s.lastPdfChoice)
  const [sections, setSections] = useState<ReadonlySet<PdfSection>>(() => new Set(last?.sections ?? defaultPdfOptions().sections))
  const [format, setFormat] = useState<PdfFormat>(project.settings.pageFormat)
  const [zonePages, setZonePages] = useState(last?.zonePages ?? true)
  // Langue des fichiers (PDF, CSV, Excel) : retenue d'un export à l'autre, la langue de l'interface au premier.
  const [docLang, setDocLang] = useState<Lang>(() => loadDocLang(lang))
  const zoneCount = project.zones.filter((z) => z.ownPdfPage).length
  const hasRacks = (project.racks?.length ?? 0) > 0
  const rackSection = (id: PdfSection): boolean => id === 'baies' || id === 'baies-cables'
  const effective = (id: PdfSection): boolean => sections.has(id) && (hasRacks || !rackSection(id))
  const zonesPossible = sections.has('schema') && zoneCount > 0
  const close = (): void => uiStore.getState().setExportOpen(false)
  const exportList = (run: (lang: Lang) => unknown): void => {
    saveDocLang(docLang)
    close()
    void run(docLang)
  }
  const toggle = (id: PdfSection, on: boolean): void =>
    setSections((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const submit = (): void => {
    const options: PdfOptions = { sections: ALL_SECTIONS.filter(effective), format, zonePages, lang: docLang }
    saveDocLang(docLang)
    if (format !== project.settings.pageFormat) projectStore.getState().setPageFormat(format)
    uiStore.getState().rememberPdfChoice({ sections: options.sections, zonePages })
    close()
    void onExport(options)
  }
  return (
    <div
      className="xd"
      role="dialog"
      aria-modal="true"
      aria-label={t.title}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
      }}
    >
      <form
        className="xd__card"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <h2 className="xd__title">{t.title}</h2>
        <fieldset className="xd__group">
          <legend className="xd__legend">{t.sections}</legend>
          {ALL_SECTIONS.map((id, i) => (
            <label key={id} className="xd__check">
              <input type="checkbox" checked={effective(id)} disabled={!hasRacks && rackSection(id)} autoFocus={i === 0} onChange={(e) => toggle(id, e.target.checked)} />
              <span>{`${i + 1}. ${pdfSectionLabel(id, m)}`}</span>
            </label>
          ))}
          {!hasRacks && <p className="xd__note">{t.noRacks}</p>}
        </fieldset>
        <label className="xd__check">
          <input type="checkbox" checked={zonesPossible && zonePages} disabled={!zonesPossible} onChange={(e) => setZonePages(e.target.checked)} />
          <span>{t.zonePages({ n: zoneCount })}</span>
        </label>
        <div className="xd__group">
          <span className="xd__legend">{t.docLang}</span>
          <Segmented ariaLabel={t.docLang} options={DOC_LANGS} value={docLang} onChange={setDocLang} />
        </div>
        <div className="xd__group">
          <span className="xd__legend">{t.format}</span>
          <Segmented ariaLabel={t.formatAria} options={formats} value={format} onChange={setFormat} />
        </div>
        <div className="xd__data">
          <span className="xd__legend">{t.lists}</span>
          <button
            type="button"
            className="btn"
            onClick={() => exportList(onCsv)}
          >
            {t.csv}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => exportList(onXlsx)}
          >
            {t.xlsx}
          </button>
        </div>
        <div className="xd__actions">
          <button type="button" className="btn" onClick={close}>
            {m.common.cancel}
          </button>
          <button type="submit" className="btn btn--primary" disabled={!ALL_SECTIONS.some(effective)}>
            {t.submit}
          </button>
        </div>
      </form>
    </div>
  )
}
