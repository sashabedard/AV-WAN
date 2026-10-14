import { useEffect, useRef } from 'react'
import { ConnectionMode, ReactFlow, useNodesInitialized, useReactFlow } from '@xyflow/react'
import type { Project, Zone } from '../model/types'
import type { CordFlowEdge, FlowNode } from '../canvas/toFlow'
import { useStaticFlow } from '../canvas/useStaticFlow'
import { StaticViewContext } from '../canvas/staticView'
import { DeviceNode } from '../canvas/DeviceNode'
import { SwitchNode } from '../canvas/SwitchNode'
import { ZoneNode } from '../canvas/ZoneNode'
import { CordEdge } from '../canvas/CordEdge'
import '../canvas/canvas.css'

const nodeTypes = { device: DeviceNode, switch: SwitchNode, zone: ZoneNode }
const edgeTypes = { cord: CordEdge }
const PRO_OPTIONS = { hideAttribution: true }
const PADDING = 0.04

// Le canvas pour l'impression : mêmes nœuds et cordons, aucune interaction (spec § 11.1). Cadre tout
// le projet, ou une zone, puis appelle onReady une seule fois.
export function StaticDiagram({ project, zone, onReady }: { project: Project; zone?: Zone; onReady: () => void }) {
  const { nodes, edges, onNodesChange } = useStaticFlow(project, 'light')
  const initialized = useNodesInitialized()
  const flow = useReactFlow<FlowNode, CordFlowEdge>()
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
    const fit = zone
      ? flow.fitBounds({ x: zone.rect.x, y: zone.rect.y, width: zone.rect.w, height: zone.rect.h }, { padding: PADDING })
      : flow.fitView({ padding: PADDING, maxZoom: 1 })
    void fit.then(
      () => onReady(),
      () => onReady()
    )
  }, [initialized, nodes.length, zone, flow, onReady])
  return (
    <StaticViewContext.Provider value={true}>
      <ReactFlow<FlowNode, CordFlowEdge>
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        connectionMode={ConnectionMode.Loose}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
