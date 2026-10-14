import { ReactFlowProvider } from '@xyflow/react'
import type { Project, Zone } from '../model/types'
import type { PdfOptions, PdfSection } from '../../../shared/pdfOptions'
import { cableSchedule } from '../reports/cableSchedule'
import { pageCss } from './pageCss'
import { useReadyGate } from './useReadyGate'
import { StaticDiagram } from './StaticDiagram'
import { TitleBlock } from './TitleBlock'
import { TablePage } from './ReportTable'
import './print.css'

// Page de schéma (Tabloïd ou A3 paysage) : le dessin, puis le pied avec le cartouche.
export function DiagramPage({ project, zone, onReady }: { project: Project; zone?: Zone; onReady: () => void }) {
  return (
    <section className="pg pg--diagram">
      <div className="pg__drawing">
        <ReactFlowProvider>
          <StaticDiagram project={project} {...(zone ? { zone } : {})} onReady={onReady} />
        </ReactFlowProvider>
        {project.devices.length === 0 && <p className="pg__empty pg__empty--drawing">Aucun appareil sur le schéma.</p>}
      </div>
      <footer className="pg__foot">
        <TitleBlock meta={project.meta} subtitle={zone ? `Zone : ${zone.name}` : 'Schéma'} />
      </footer>
    </section>
  )
}

// Le document entier, dans l'ordre de la spec § 11.1. onReady : tout est cadré et peint.
export function PrintDocument({ project, options, onReady }: { project: Project; options: PdfOptions; onReady: () => void }) {
  const has = (s: PdfSection): boolean => options.sections.includes(s)
  const done = useReadyGate(has('schema') ? 1 : 0, onReady)
  return (
    <div className="print">
      <style>{pageCss(options.format, project.meta)}</style>
      {has('schema') && <DiagramPage project={project} onReady={done} />}
      {has('branchement') && <TablePage table={cableSchedule(project)} empty="Aucun câble dans le projet." />}
    </div>
  )
}
