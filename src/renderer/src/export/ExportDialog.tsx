// src/renderer/src/export/ExportDialog.tsx
import { useState } from 'react'
import { PDF_FORMAT_LABELS, PDF_SECTIONS, type PdfFormat, type PdfOptions, type PdfSection } from '../../../shared/pdfOptions'
import { projectStore, useProject } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { Segmented } from '../panels/Segmented'
import { exportCsvAction, exportPdfAction, exportXlsxAction } from './exportActions'
import './export.css'

const FORMATS = (['na', 'iso'] as const).map((value) => ({ value, label: PDF_FORMAT_LABELS[value] }))
const ALL_SECTIONS = PDF_SECTIONS.map((s) => s.id)

interface Props {
  onExport?: (options: PdfOptions) => unknown
  onCsv?: () => unknown
  onXlsx?: () => unknown
}

// Boîte « Exporter » (spec § 11) : le PDF (sections, format, pages de zone), ou les listes en CSV et en Excel.
export function ExportDialog({ onExport = exportPdfAction, onCsv = exportCsvAction, onXlsx = exportXlsxAction }: Props) {
  const open = useUiStore((s) => s.exportOpen)
  return open ? <ExportForm onExport={onExport} onCsv={onCsv} onXlsx={onXlsx} /> : null
}

function ExportForm({ onExport, onCsv, onXlsx }: Required<Props>) {
  const project = useProject()
  const last = useUiStore((s) => s.lastPdfChoice)
  const [sections, setSections] = useState<ReadonlySet<PdfSection>>(() => new Set(last?.sections ?? ALL_SECTIONS))
  const [format, setFormat] = useState<PdfFormat>(project.settings.pageFormat)
  const [zonePages, setZonePages] = useState(last?.zonePages ?? true)
  const zoneCount = project.zones.filter((z) => z.ownPdfPage).length
  const zonesPossible = sections.has('schema') && zoneCount > 0
  const close = (): void => uiStore.getState().setExportOpen(false)
  const toggle = (id: PdfSection, on: boolean): void =>
    setSections((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const submit = (): void => {
    const options: PdfOptions = { sections: ALL_SECTIONS.filter((id) => sections.has(id)), format, zonePages }
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
      aria-label="Exporter le PDF"
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
        <h2 className="xd__title">Exporter le PDF</h2>
        <fieldset className="xd__group">
          <legend className="xd__legend">Sections</legend>
          {PDF_SECTIONS.map((s, i) => (
            <label key={s.id} className="xd__check">
              <input type="checkbox" checked={sections.has(s.id)} autoFocus={i === 0} onChange={(e) => toggle(s.id, e.target.checked)} />
              <span>{`${i + 1}. ${s.label}`}</span>
            </label>
          ))}
        </fieldset>
        <label className="xd__check">
          <input type="checkbox" checked={zonesPossible && zonePages} disabled={!zonesPossible} onChange={(e) => setZonePages(e.target.checked)} />
          <span>{`Pages de zone agrandies (${zoneCount})`}</span>
        </label>
        <div className="xd__group">
          <span className="xd__legend">Format</span>
          <Segmented ariaLabel="Format des pages" options={FORMATS} value={format} onChange={setFormat} />
        </div>
        <div className="xd__data">
          <span className="xd__legend">Listes (branchement, plan IP, nomenclature)</span>
          <button
            type="button"
            className="btn"
            onClick={() => {
              close()
              void onCsv()
            }}
          >
            CSV…
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              close()
              void onXlsx()
            }}
          >
            Excel…
          </button>
        </div>
        <div className="xd__actions">
          <button type="button" className="btn" onClick={close}>
            Annuler
          </button>
          <button type="submit" className="btn btn--primary" disabled={sections.size === 0}>
            Exporter le PDF…
          </button>
        </div>
      </form>
    </div>
  )
}
