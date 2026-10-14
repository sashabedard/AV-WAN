import { ReactFlowProvider } from '@xyflow/react'
import type { Project, Zone } from '../model/types'
import type { PdfOptions, PdfSection } from '../../../shared/pdfOptions'
import { cableSchedule } from '../reports/cableSchedule'
import { ipPlan } from '../reports/ipPlan'
import { bom } from '../reports/bom'
import { PrintLegend } from './PrintLegend'
import { DeviceSheetsPage, PortMapsPage, VlanSheetsPage } from './sections'
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
        <PrintLegend project={project} />
        <TitleBlock meta={project.meta} subtitle={zone ? `Zone : ${zone.name}` : 'Schéma'} />
      </footer>
    </section>
  )
}

// Le document entier, dans l'ordre de la spec § 11.1. onReady : chaque schéma est cadré et tout est peint.
export function PrintDocument({ project, options, onReady }: { project: Project; options: PdfOptions; onReady: () => void }) {
  const has = (s: PdfSection): boolean => options.sections.includes(s)
  const zones = has('schema') && options.zonePages ? project.zones.filter((z) => z.ownPdfPage) : []
  const done = useReadyGate((has('schema') ? 1 : 0) + zones.length, onReady)
  return (
    <div className="print">
      <style>{pageCss(options.format, project.meta)}</style>
      {has('schema') && <DiagramPage project={project} onReady={done} />}
      {zones.map((z) => (
        <DiagramPage key={z.id} project={project} zone={z} onReady={done} />
      ))}
      {has('appareils') && <DeviceSheetsPage project={project} />}
      {has('ports') && <PortMapsPage project={project} />}
      {has('branchement') && <TablePage table={cableSchedule(project)} empty="Aucun câble dans le projet." />}
      {has('vlans') && <VlanSheetsPage project={project} />}
      {has('ip') && <TablePage table={ipPlan(project)} empty="Aucune adresse IP dans le projet." />}
      {has('nomenclature') && <TablePage table={bom(project)} empty="Projet vide : rien à commander." />}
    </div>
  )
}
