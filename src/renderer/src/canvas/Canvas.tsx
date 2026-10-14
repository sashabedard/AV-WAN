import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type FinalConnectionState,
  type NodeChange,
  type OnNodeDrag,
  type OnSelectionChangeParams
} from '@xyflow/react'
import { projectStore, useProject, useProjectStore } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { useThemeMode } from '../theme/useThemeMode'
import { TEMPLATE_MIME } from '../panels/Palette'
import { analyzeLinks, createFlowCache, toFlowEdges, toFlowNodes, type CordFlowEdge, type DeviceFlowNode } from './toFlow'
import { GRID, mergeEdges, mergeNodes, snapPoint } from './canvasHelpers'
import { clientPoint, connectionRefs, dropOnDevice, makeIsValidConnection, nodeIdAt } from './connect'
import { useAltKey } from './useAltKey'
import { DeviceNode } from './DeviceNode'
import { CordEdge } from './CordEdge'
import { SwitchNode } from './SwitchNode'
import { QuickSearch } from '../panels/QuickSearch'
import { canvasPointer, centreOf } from './pointer'
import { SwitchConfigurator } from '../panels/SwitchConfigurator'
import { DEFAULT_SWITCH_SPEC } from '../catalog/switch'
import { registerFlowInstance } from '../dev/e2eHooks'
import './canvas.css'

const nodeTypes = { device: DeviceNode, switch: SwitchNode }
const edgeTypes = { cord: CordEdge }
const SNAP_GRID: [number, number] = [GRID, GRID]
const DELETE_KEYS = ['Backspace', 'Delete']
const CONNECTION_LINE_STYLE = { stroke: 'var(--accent)', strokeWidth: 3 }
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
  const derivedEdges = useMemo(() => toFlowEdges(project, analysis, cache.current), [project, analysis])
  const [edges, setEdges] = useState(derivedEdges)
  useEffect(() => setEdges((prev) => mergeEdges(derivedEdges, prev)), [derivedEdges])
  const onEdgesChange = useCallback((changes: EdgeChange<CordFlowEdge>[]) => setEdges((es) => applyEdgeChanges(changes, es)), [])

  const pendingTemplate = useUiStore((s) => s.pendingTemplateId)
  const pendingSwitch = useUiStore((s) => s.pendingSwitch)
  const search = useUiStore((s) => s.search)
  const wrapper = useRef<HTMLDivElement>(null)
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

  const isValidConnection = useMemo(() => makeIsValidConnection(() => projectStore.getState().history.present), [])
  const onConnect = useCallback((c: Connection) => {
    const refs = connectionRefs(c)
    if (refs) projectStore.getState().connect(refs[0], refs[1])
  }, [])
  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
    if (state.isValid || !state.fromNode || !state.fromHandle?.id) return
    const point = clientPoint(event)
    if (!point) return
    const targetId = nodeIdAt(document, point)
    if (!targetId) return
    const s = projectStore.getState()
    const from = { deviceId: state.fromNode.id, portId: state.fromHandle.id }
    const res = dropOnDevice(s.history.present, from, targetId)
    if (res.ok) s.connect(from, res.to)
    else if (res.message) s.showToast(res.message)
  }, [])

  const place = useCallback(
    (templateId: string, client: { x: number; y: number }) => {
      const position = snapPoint(screenToFlowPosition(client), project.settings.snapToGrid)
      if (templateId === 'switch') uiStore.getState().setPendingSwitch({ position, screen: client })
      else projectStore.getState().addDevice(templateId, position)
    },
    [screenToFlowPosition, project.settings.snapToGrid]
  )
  const onPaneMouseMove = useCallback((e: ReactMouseEvent) => {
    canvasPointer.client = { x: e.clientX, y: e.clientY }
  }, [])
  // Double-clic dans le vide : recherche rapide à cet endroit (spec § 9.1).
  const onDoubleClick = useCallback((e: ReactMouseEvent) => {
    if ((e.target as Element).classList?.contains('react-flow__pane')) uiStore.getState().openSearch({ x: e.clientX, y: e.clientY })
  }, [])
  const onPick = useCallback(
    (templateId: string) => {
      const at = uiStore.getState().search?.at ?? canvasPointer.client ?? centreOf(wrapper.current)
      uiStore.getState().closeSearch()
      if (at) place(templateId, at)
    },
    [place]
  )
  const closeSearch = useCallback(() => uiStore.getState().closeSearch(), [])
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
    <div ref={wrapper} className={`canvas${pendingTemplate ? ' canvas--placing' : ''}`} onDoubleClick={onDoubleClick}>
      <ReactFlow<DeviceFlowNode, CordFlowEdge>
        nodes={nodes}
        onInit={registerFlowInstance}
        onPaneMouseMove={onPaneMouseMove}
        nodeTypes={nodeTypes}
        edges={edges}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        zoomOnDoubleClick={false}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={CONNECTION_LINE_STYLE}
        nodesConnectable={!readOnly}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
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
      {pendingSwitch && (
        <div
          className="popover"
          style={{ left: Math.min(pendingSwitch.screen.x, window.innerWidth - 340), top: Math.min(pendingSwitch.screen.y, window.innerHeight - 400) }}
        >
          <SwitchConfigurator
            initial={DEFAULT_SWITCH_SPEC}
            submitLabel="Créer"
            onCancel={() => uiStore.getState().setPendingSwitch(null)}
            onSubmit={(spec) => {
              projectStore.getState().addDevice('switch', pendingSwitch.position, { switchSpec: spec })
              uiStore.getState().setPendingSwitch(null)
            }}
          />
        </div>
      )}
      {search && <QuickSearch onPick={onPick} onClose={closeSearch} />}
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
