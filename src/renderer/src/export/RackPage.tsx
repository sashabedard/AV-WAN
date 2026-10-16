import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConnectionMode, ReactFlow, ReactFlowProvider, applyNodeChanges, useNodesInitialized, useReactFlow, type NodeChange } from '@xyflow/react'
import type { Project, Rack } from '../model/types'
import type { CordFlowEdge } from '../canvas/toFlow'
import { StaticViewContext } from '../canvas/staticView'
import { mergeNodes } from '../canvas/canvasHelpers'
import { SwitchNode } from '../canvas/SwitchNode'
import { CordEdge } from '../canvas/CordEdge'
import { RackNode } from '../racks/RackNode'
import { RackDeviceNode } from '../racks/RackDeviceNode'
import { StubNode } from '../racks/StubNode'
import { toRackFlow, type RackFlowNode } from '../racks/toRackFlow'
import { useT } from '../i18n/useT'
import { PrintLegend } from './PrintLegend'
import { TitleBlock } from './TitleBlock'
import '../canvas/canvas.css'
import '../racks/racks.css'

const nodeTypes = { rack: RackNode, switch: SwitchNode, rackDevice: RackDeviceNode, stub: StubNode }
const edgeTypes = { cord: CordEdge }
const PRO_OPTIONS = { hideAttribution: true }
const PADDING = 0.04

// Au-delà de ce nombre de câbles dans la baie, l'élévation câblée n'est plus lisible à l'échelle d'une page (spec § 8.6).
export const RACK_PDF_MAX_CABLES = 40

// Le projet vu depuis une seule baie : les appareils des autres baies n'y sont pas placés, leurs câbles deviennent des bouts de câble.
export function projectForRack(project: Project, rack: Rack): Project {
  return {
    ...project,
    racks: [rack],
    devices: project.devices.map((d) => {
      if (!d.rack || d.rack.rackId === rack.id) return d
      const { rack: _other, ...rest } = d
      return rest
    })
  }
}

function StaticRackDiagram({ project, cables, onReady }: { project: Project; cables: boolean; onReady: () => void }) {
  const { m } = useT()
  const derived = useMemo(() => toRackFlow(project, 'light', m, { cables }), [project, m, cables])
  const [nodes, setNodes] = useState<RackFlowNode[]>(derived.nodes)
  useEffect(() => setNodes((prev) => mergeNodes(derived.nodes, prev)), [derived.nodes])
  // Sans les dimensions mesurées, useNodesInitialized() resterait faux (comme useStaticFlow).
  const onNodesChange = useCallback((changes: NodeChange<RackFlowNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns)), [])
  const initialized = useNodesInitialized()
  const flow = useReactFlow<RackFlowNode, CordFlowEdge>()
  const done = useRef(false)
  useEffect(() => {
    if (done.current) return
    if (nodes.length === 0) {
      done.current = true
      onReady()
      return
    }
    if (!initialized) return
    done.current = true
    void flow.fitView({ padding: PADDING, maxZoom: 1 }).then(
      () => onReady(),
      () => onReady()
    )
  }, [nodes, initialized, flow, onReady])
  return (
    <StaticViewContext.Provider value={true}>
      <ReactFlow<RackFlowNode, CordFlowEdge>
        nodes={nodes}
        edges={derived.edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        minZoom={0.02}
        maxZoom={2}
        colorMode="light"
        proOptions={PRO_OPTIONS}
      />
    </StaticViewContext.Provider>
  )
}

// Page d'élévation d'une baie (propre, ou avec câbles) : le dessin, puis le pied avec le cartouche.
export function RackPage({ project, rack, cables, onReady }: { project: Project; rack: Rack; cables: boolean; onReady: () => void }) {
  const { m } = useT()
  const view = useMemo(() => projectForRack(project, rack), [project, rack])
  const cableCount = useMemo(() => (cables ? toRackFlow(view, 'light', m, { cables: true }).edges.length : 0), [view, m, cables])
  const tooMany = cables && cableCount > RACK_PDF_MAX_CABLES
  const zone = rack.zoneId ? project.zones.find((z) => z.id === rack.zoneId)?.name : undefined
  return (
    <section className="pg pg--diagram">
      <div className="pg__drawing">
        <ReactFlowProvider>
          <StaticRackDiagram project={view} cables={cables && !tooMany} onReady={onReady} />
        </ReactFlowProvider>
      </div>
      <footer className="pg__foot">
        <PrintLegend project={project} />
        {tooMany && <p className="pg__empty">{m.pdf.rack.tooMany}</p>}
        <TitleBlock meta={project.meta} subtitle={m.pdf.rack.title({ name: rack.name, ...(zone ? { zone } : {}), heightU: rack.heightU })} />
      </footer>
    </section>
  )
}
