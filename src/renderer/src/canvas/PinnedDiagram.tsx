import { useCallback, useEffect, useMemo, type MouseEvent as ReactMouseEvent } from 'react'
import { ConnectionMode, ReactFlow, useReactFlow, useStore } from '@xyflow/react'
import { projectStore, useProject, useProjectStore } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { useThemeMode } from '../theme/useThemeMode'
import { useStaticFlow } from './useStaticFlow'
import { syncSelected } from './canvasHelpers'
import { StaticViewContext } from './staticView'
import { centerOn } from './viewport'
import { clickSelection, type PinnedRect, type PinnedTarget } from './pinnedView'
import type { CordFlowEdge, FlowNode } from './toFlow'
import { DeviceNode } from './DeviceNode'
import { SwitchNode } from './SwitchNode'
import { ZoneNode } from './ZoneNode'
import { CordEdge } from './CordEdge'

const nodeTypes = { device: DeviceNode, switch: SwitchNode, zone: ZoneNode }
const edgeTypes = { cord: CordEdge }
const PRO_OPTIONS = { hideAttribution: true }
const PADDING = 0.02

// Un clic dans la vignette sélectionne comme dans le canvas principal (Shift, ⌘ ou Ctrl : ajout ou retrait).
function selectFromPinned(target: PinnedTarget, e: ReactMouseEvent): void {
  const s = projectStore.getState()
  uiStore.getState().setInspectVlan(null)
  s.setSelection(clickSelection(s.selection, target, e.shiftKey || e.metaKey || e.ctrlKey))
}

// Le schéma de la vignette (spec 2026-10-14 § 3.3) : le projet en direct, cadré sur le rectangle épinglé.
// Seuls le clic (sélection) et le double-clic (recentrer la vue principale) agissent.
export function PinnedDiagram({ rect }: { rect: PinnedRect }) {
  const project = useProject()
  const theme = useThemeMode()
  const { nodes, edges, onNodesChange } = useStaticFlow(project, theme)
  const selection = useProjectStore((s) => s.selection)
  const shownNodes = useMemo(() => syncSelected(nodes, new Set([...selection.deviceIds, ...(selection.zoneIds ?? [])])), [nodes, selection])
  const shownEdges = useMemo(() => syncSelected(edges, new Set(selection.linkIds)), [edges, selection])
  // Recadrer quand le cadre change ou quand la vignette change de taille (taille mesurée par React Flow).
  const { fitBounds } = useReactFlow<FlowNode, CordFlowEdge>()
  const width = useStore((s) => s.width)
  const height = useStore((s) => s.height)
  useEffect(() => {
    if (width === 0 || height === 0) return
    void fitBounds({ x: rect.x, y: rect.y, width: rect.w, height: rect.h }, { padding: PADDING })
  }, [fitBounds, rect, width, height])
  const onNodeClick = useCallback(
    (e: ReactMouseEvent, node: FlowNode) => selectFromPinned({ kind: node.type === 'zone' ? 'zone' : 'device', id: node.id }, e),
    []
  )
  const onEdgeClick = useCallback((e: ReactMouseEvent, edge: CordFlowEdge) => selectFromPinned({ kind: 'link', id: edge.id }, e), [])
  const onNodeDoubleClick = useCallback((_e: ReactMouseEvent, node: FlowNode) => {
    const w = node.measured?.width ?? node.width ?? 0
    const h = node.measured?.height ?? node.height ?? 0
    centerOn(node.position.x + w / 2, node.position.y + h / 2)
  }, [])
  return (
    <StaticViewContext.Provider value={true}>
      <div className="pinned__flow">
        <ReactFlow<FlowNode, CordFlowEdge>
          id="pinned"
          nodes={shownNodes}
          edges={shownEdges}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          connectionMode={ConnectionMode.Loose}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          edgesReconnectable={false}
          elementsSelectable={false}
          panOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          panActivationKeyCode={null}
          zoomActivationKeyCode={null}
          selectionOnDrag={false}
          deleteKeyCode={null}
          selectionKeyCode={null}
          multiSelectionKeyCode={null}
          minZoom={0.02}
          maxZoom={4}
          colorMode={theme}
          proOptions={PRO_OPTIONS}
        />
      </div>
    </StaticViewContext.Provider>
  )
}
