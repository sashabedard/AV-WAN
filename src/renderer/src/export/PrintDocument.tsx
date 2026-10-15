import { useMemo } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import type { Project, Zone } from '../model/types'
import type { PdfOptions, PdfSection } from '../../../shared/pdfOptions'
import { cableSchedule } from '../reports/cableSchedule'
import { ipPlan } from '../reports/ipPlan'
import { bom } from '../reports/bom'
import { zonePageNumbers } from '../reports/zoneSheet'
import { PrintLegend } from './PrintLegend'
import { DeviceSheetsPage, PatchPage, PortMapsPage, VlanSheetsPage } from './sections'
import { pageCss } from './pageCss'
import { useReadyGate } from './useReadyGate'
import { StaticDiagram } from './StaticDiagram'
import { TitleBlock } from './TitleBlock'
import { TablePage } from './ReportTable'
import './print.css'

// Page de schéma (Tabloïd ou A3 paysage) : le dessin, puis le pied avec le cartouche.
export function DiagramPage({ project, zone, pages, onReady }: { project: Project; zone?: Zone; pages: Map<string, number>; onReady: () => void }) {
  return (
    <section className="pg pg--diagram">
      <div className="pg__drawing">
        <ReactFlowProvider>
          <StaticDiagram project={project} {...(zone ? { zone } : {})} pages={pages} onReady={onReady} />
        </ReactFlowProvider>
        {project.devices.length === 0 && <p className="pg__empty pg__empty--drawing">Aucun appareil sur le schéma.</p>}
      </div>
      <footer className="pg__foot">
        <PrintLegend project={project} />
        <TitleBlock meta={project.meta} subtitle={zone ? `Zone : ${zone.name}` : 'Vue d’ensemble'} />
      </footer>
    </section>
  )
}

// Le document entier, dans l'ordre de la spec § 11.1. onReady : chaque schéma est cadré et tout est peint.
export function PrintDocument({ project, options, onReady }: { project: Project; options: PdfOptions; onReady: () => void }) {
  const has = (s: PdfSection): boolean => options.sections.includes(s)
  const zones = has('schema') && options.zonePages ? project.zones.filter((z) => z.ownPdfPage) : []
  const pages = useMemo(() => (has('schema') ? zonePageNumbers(project, options.zonePages) : new Map<string, number>()), [project, options.zonePages, options.sections])
  const done = useReadyGate((has('schema') ? 1 : 0) + zones.length, onReady)
  return (
    <div className="print">
      <style>{pageCss(options.format, project.meta)}</style>
      {has('schema') && <DiagramPage project={project} pages={pages} onReady={done} />}
      {zones.map((z) => (
        <DiagramPage key={z.id} project={project} zone={z} pages={pages} onReady={done} />
      ))}
      {has('appareils') && <DeviceSheetsPage project={project} />}
      {has('ports') && <PortMapsPage project={project} />}
      {has('branchement') && <TablePage table={cableSchedule(project)} empty="Aucun câble dans le projet." />}
      {has('vlans') && <VlanSheetsPage project={project} />}
      {has('ip') && <TablePage table={ipPlan(project)} empty="Aucune adresse IP dans le projet." />}
      {has('patch') && <PatchPage project={project} />}
      {has('nomenclature') && <TablePage table={bom(project)} empty="Projet vide : rien à commander." />}
    </div>
  )
}
