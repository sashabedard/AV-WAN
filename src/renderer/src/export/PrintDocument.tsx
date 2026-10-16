import { useMemo } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import type { Project, Zone } from '../model/types'
import type { PdfOptions, PdfSection } from '../../../shared/pdfOptions'
import { cableSchedule } from '../reports/cableSchedule'
import { ipPlan } from '../reports/ipPlan'
import { bom } from '../reports/bom'
import { zonePageNumbers } from '../reports/zoneSheet'
import { useT } from '../i18n/useT'
import { PrintLegend } from './PrintLegend'
import { ChannelsPage, DeviceSheetsPage, PatchPage, PortMapsPage, PowerPage, VlanSheetsPage } from './sections'
import { pageCss } from './pageCss'
import { useReadyGate } from './useReadyGate'
import { StaticDiagram } from './StaticDiagram'
import { RackPage } from './RackPage'
import { TitleBlock } from './TitleBlock'
import { TablePage } from './ReportTable'
import './print.css'

// Page de schéma (Tabloïd ou A3 paysage) : le dessin, puis le pied avec le cartouche.
export function DiagramPage({ project, zone, pages, onReady }: { project: Project; zone?: Zone; pages: Map<string, number>; onReady: () => void }) {
  const { pdf } = useT().m
  return (
    <section className="pg pg--diagram">
      <div className="pg__drawing">
        <ReactFlowProvider>
          <StaticDiagram project={project} {...(zone ? { zone } : {})} pages={pages} onReady={onReady} />
        </ReactFlowProvider>
        {project.devices.length === 0 && <p className="pg__empty pg__empty--drawing">{pdf.emptyDiagram}</p>}
      </div>
      <footer className="pg__foot">
        <PrintLegend project={project} />
        <TitleBlock meta={project.meta} subtitle={zone ? pdf.zoneTitle({ name: zone.name }) : pdf.overview} />
      </footer>
    </section>
  )
}

// Le document entier, dans l'ordre de la spec § 11.1. onReady : chaque schéma est cadré et tout est peint.
export function PrintDocument({ project, options, onReady }: { project: Project; options: PdfOptions; onReady: () => void }) {
  const { m, lang } = useT()
  const has = (s: PdfSection): boolean => options.sections.includes(s)
  const zones = has('schema') && options.zonePages ? project.zones.filter((z) => z.ownPdfPage) : []
  const pages = useMemo(() => (has('schema') ? zonePageNumbers(project, options.zonePages) : new Map<string, number>()), [project, options.zonePages, options.sections])
  // Une page par baie et par variante cochée, baie par baie (propre, puis câblée) — spec § 8.6.
  const rackVariants = (project.racks ?? []).flatMap((rack) => ([['baies', false], ['baies-cables', true]] as const).filter(([id]) => has(id)).map(([, cables]) => ({ rack, cables })))
  const done = useReadyGate((has('schema') ? 1 : 0) + zones.length + rackVariants.length, onReady)
  return (
    <div className="print">
      <style>{pageCss(options.format, project.meta, lang)}</style>
      {has('schema') && <DiagramPage project={project} pages={pages} onReady={done} />}
      {zones.map((z) => (
        <DiagramPage key={z.id} project={project} zone={z} pages={pages} onReady={done} />
      ))}
      {has('appareils' /* i18n-ignore : id de section */) && <DeviceSheetsPage project={project} />}
      {has('ports') && <PortMapsPage project={project} />}
      {has('branchement') && <TablePage table={cableSchedule(project, lang)} empty={m.pdf.empty.cabling} />}
      {has('vlans') && <VlanSheetsPage project={project} />}
      {has('ip') && <TablePage table={ipPlan(project, lang)} empty={m.pdf.empty.ip} />}
      {has('patch') && <PatchPage project={project} />}
      {has('canaux' /* i18n-ignore : id de section */) && <ChannelsPage project={project} />}
      {has('puissance' /* i18n-ignore : id de section */) && <PowerPage project={project} />}
      {has('nomenclature') && <TablePage table={bom(project, lang)} empty={m.pdf.empty.bom} />}
      {rackVariants.map(({ rack, cables }) => (
        <RackPage key={`${rack.id}|${cables}`} project={project} rack={rack} cables={cables} onReady={done} />
      ))}
    </div>
  )
}
