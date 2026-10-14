import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useReactFlow,
  type NodeChange,
  type OnNodeDrag,
  type OnSelectionChangeParams
} from '@xyflow/react'
import { projectStore, useProject, useProjectStore } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { useThemeMode } from '../theme/useThemeMode'
import { TEMPLATE_MIME } from '../panels/Palette'
import { analyzeLinks, createFlowCache, toFlowNodes, type CordFlowEdge, type DeviceFlowNode } from './toFlow'
import { GRID, mergeNodes, snapPoint } from './canvasHelpers'
import { useAltKey } from './useAltKey'
import { DeviceNode } from './DeviceNode'
import './canvas.css'

const nodeTypes = { device: DeviceNode, switch: DeviceNode }
const SNAP_GRID: [number, number] = [GRID, GRID]
const DELETE_KEYS = ['Backspace', 'Delete']
const PRO_OPTIONS = { hideAttribution: true }

function CanvasInner() {
  const project = useProject()
  const readOnly = useProjectStore((s) => s.readOnly)
  const theme = useThemeMode()
  const cache = useRef(createFlowCache())
  const analysis = useMemo(() => analyzeLinks(project, theme), [project, theme])
  const derivedNodes = useMemo(() => toFlowNodes(project, analysis, cache.current), [project, analysis])
  const [nodes, setNodes] = useState(derivedNodes)
  useEffect(() => setNodes((prev) => mergeNodes(derivedNodes, prev)), [derivedNodes])

  const pendingTemplate = useUiStore((s) => s.pendingTemplateId)
  const alt = useAltKey()
  const { screenToFlowPosition } = useReactFlow()

  const onNodesChange = useCallback((changes: NodeChange<DeviceFlowNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns)), [])
  const onNodeDragStop: OnNodeDrag<DeviceFlowNode> = useCallback((_event, _node, dragged) => {
    projectStore.getState().moveDevices(dragged.map((n) => ({ id: n.id, position: n.position })))
  }, [])
  const onSelectionChange = useCallback(({ nodes: ns, edges: es }: OnSelectionChangeParams<DeviceFlowNode, CordFlowEdge>) => {
    projectStore.getState().setSelection({ deviceIds: ns.map((n) => n.id), linkIds: es.map((e) => e.id) })
  }, [])
  const onDelete = useCallback(({ nodes: ns, edges: es }: { nodes: DeviceFlowNode[]; edges: CordFlowEdge[] }) => {
    projectStore.getState().removeElements(ns.map((n) => n.id), es.map((e) => e.id))
  }, [])

  const place = useCallback(
    (templateId: string, client: { x: number; y: number }) => {
      const position = snapPoint(screenToFlowPosition(client), project.settings.snapToGrid)
      projectStore.getState().addDevice(templateId, position)
    },
    [screenToFlowPosition, project.settings.snapToGrid]
  )
  const onDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer.types.includes(TEMPLATE_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])
  const onDrop = useCallback(
    (e: DragEvent) => {
      const id = e.dataTransfer.getData(TEMPLATE_MIME)
      if (!id) return
      e.preventDefault()
      place(id, { x: e.clientX, y: e.clientY })
    },
    [place]
  )
  const onPaneClick = useCallback(
    (e: ReactMouseEvent) => {
      const id = uiStore.getState().pendingTemplateId
      if (!id) return
      uiStore.getState().setPendingTemplate(null)
      place(id, { x: e.clientX, y: e.clientY })
    },
    [place]
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      uiStore.getState().setPendingTemplate(null)
      uiStore.getState().setPendingSwitch(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className={`canvas${pendingTemplate ? ' canvas--placing' : ''}`}>
      <ReactFlow<DeviceFlowNode, CordFlowEdge>
        nodes={nodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        onDelete={onDelete}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodesDraggable={!readOnly}
        snapToGrid={project.settings.snapToGrid && !alt}
        snapGrid={SNAP_GRID}
        deleteKeyCode={readOnly ? null : DELETE_KEYS}
        minZoom={0.2}
        maxZoom={2.5}
        colorMode={theme}
        proOptions={PRO_OPTIONS}
      >
        <Background id="minor" className="bg-minor" variant={BackgroundVariant.Lines} gap={GRID} lineWidth={0.5} />
        <Background id="major" className="bg-major" variant={BackgroundVariant.Lines} gap={GRID * 5} lineWidth={0.7} />
      </ReactFlow>
    </div>
  )
}

export function Canvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  )
}
