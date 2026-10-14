import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConnectionMode, ReactFlow, applyNodeChanges, useNodesInitialized, useReactFlow, type NodeChange } from '@xyflow/react'
import type { Project, Zone } from '../model/types'
import { analyzeLinks, createFlowCache, toFlowEdges, toFlowNodes, toFlowZones, type CordFlowEdge, type FlowNode } from '../canvas/toFlow'
import { mergeNodes } from '../canvas/canvasHelpers'
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
  const cache = useRef(createFlowCache())
  const analysis = useMemo(() => analyzeLinks(project, 'light'), [project])
  const derivedNodes = useMemo<FlowNode[]>(() => [...toFlowZones(project, cache.current), ...toFlowNodes(project, analysis, cache.current)], [project, analysis])
  // React Flow 12 renvoie les dimensions mesurées par onNodesChange : sans les appliquer aux nœuds,
  // useNodesInitialized() resterait faux et le PDF attendrait jusqu'au délai maximal (comme Canvas).
  const [nodes, setNodes] = useState(derivedNodes)
  useEffect(() => setNodes((prev) => mergeNodes(derivedNodes, prev)), [derivedNodes])
  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns)), [])
  const edges = useMemo<CordFlowEdge[]>(() => toFlowEdges(project, analysis, cache.current), [project, analysis])
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
  )
}
