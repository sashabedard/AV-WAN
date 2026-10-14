import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useNodesInitialized,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type FinalConnectionState,
  type NodeChange,
  type OnNodeDrag,
  type OnSelectionChangeParams,
  type ReactFlowInstance
} from '@xyflow/react'
import { projectStore, useProject, useProjectStore } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { useThemeMode } from '../theme/useThemeMode'
import { TEMPLATE_MIME } from '../panels/Palette'
import { analyzeLinks, createFlowCache, toFlowEdges, toFlowNodes, type CordFlowEdge, type DeviceFlowNode } from './toFlow'
import { GRID, mergeEdges, mergeNodes, nodesMatchDerived, snapPoint } from './canvasHelpers'
import { clientPoint, connectionRefs, dropOnDevice, makeIsValidConnection, nodeIdAt, reconnectEnd } from './connect'
import { useAltKey } from './useAltKey'
import { FIT_OPTIONS, registerViewport } from './viewport'
import { arrowDelta, nudgeMoves } from './keyboard'
import { isTextInput } from '../app/routeEditCommand'
import { DeviceNode } from './DeviceNode'
import { CordEdge } from './CordEdge'
import { SwitchNode } from './SwitchNode'
import { Legend } from './Legend'
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
const MULTI_SELECT_KEYS = ['Shift', 'Meta', 'Control']
const MINIMAP_STYLE = { left: 46 }
const RECONNECT_RADIUS = 12
function minimapNodeClass(node: DeviceFlowNode): string {
  return node.type === 'switch' ? 'mm-rack' : 'mm-device'
}

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
  const { screenToFlowPosition, fitView } = useReactFlow()
  const onInit = useCallback((instance: ReactFlowInstance<DeviceFlowNode, CordFlowEdge>) => {
    registerFlowInstance(instance)
    registerViewport(instance)
  }, [])

  // Cadrer le contenu à l'ouverture d'un fichier (report du plan 1), une seule fois par document.
  const docId = useProjectStore((s) => s.docId)
  const nodesReady = useNodesInitialized()
  const nodesForDoc = nodesMatchDerived(nodes, derivedNodes)
  const fittedDoc = useRef<number | null>(null)
  useEffect(() => {
    if (fittedDoc.current === docId) return
    const p = projectStore.getState().history.present
    if (p.devices.length === 0 && p.zones.length === 0) {
      fittedDoc.current = docId
      return
    }
    if (!nodesReady || !nodesForDoc) return
    fittedDoc.current = docId
    void fitView(FIT_OPTIONS)
  }, [docId, nodesReady, nodesForDoc, fitView])

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

  const isValidConnection = useMemo(
    () => makeIsValidConnection(() => projectStore.getState().history.present, () => uiStore.getState().reconnectingLinkId),
    []
  )
  const onReconnectStart = useCallback((_e: ReactMouseEvent, edge: CordFlowEdge) => uiStore.getState().setReconnecting(edge.id), [])
  const onReconnect = useCallback((oldEdge: CordFlowEdge, c: Connection) => {
    const s = projectStore.getState()
    const link = s.history.present.links.find((l) => l.id === oldEdge.id)
    const move = link ? reconnectEnd(link, c) : null
    if (move) s.reconnect(oldEdge.id, move.end, move.to)
  }, [])
  const onReconnectEnd = useCallback(() => uiStore.getState().setReconnecting(null), [])
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
    (templateId: string, client: { x: number; y: number }, alt = false) => {
      const position = snapPoint(screenToFlowPosition(client), project.settings.snapToGrid && !alt)
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
  const onNodeMouseEnter = useCallback((_e: ReactMouseEvent, node: DeviceFlowNode) => uiStore.getState().setHoverDevice(node.id), [])
  const onNodeMouseLeave = useCallback(() => uiStore.getState().setHoverDevice(null), [])
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
      place(id, { x: e.clientX, y: e.clientY }, e.altKey)
    },
    [place]
  )
  const onPaneClick = useCallback(
    (e: ReactMouseEvent) => {
      const id = uiStore.getState().pendingTemplateId
      if (!id) return
      uiStore.getState().setPendingTemplate(null)
      place(id, { x: e.clientX, y: e.clientY }, e.altKey)
    },
    [place]
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        uiStore.getState().setPendingTemplate(null)
        uiStore.getState().setPendingSwitch(null)
        uiStore.getState().setFocusVlan(null)
        return
      }
      const delta = arrowDelta(e.key, e.shiftKey)
      if (!delta || e.metaKey || e.ctrlKey || e.altKey || isTextInput(document.activeElement)) return
      const s = projectStore.getState()
      if (s.readOnly || s.selection.deviceIds.length === 0) return
      e.preventDefault()
      s.moveDevices(nudgeMoves(s.history.present, s.selection.deviceIds, delta))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div ref={wrapper} className={`canvas${pendingTemplate ? ' canvas--placing' : ''}${project.settings.colorMode === 'port' ? ' canvas--port' : ''}`} onDoubleClick={onDoubleClick}>
      <ReactFlow<DeviceFlowNode, CordFlowEdge>
        nodes={nodes}
        onInit={onInit}
        multiSelectionKeyCode={MULTI_SELECT_KEYS}
        disableKeyboardA11y
        onPaneMouseMove={onPaneMouseMove}
        nodeTypes={nodeTypes}
        edges={edges}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        zoomOnDoubleClick={false}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        edgesReconnectable={!readOnly}
        reconnectRadius={RECONNECT_RADIUS}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={CONNECTION_LINE_STYLE}
        nodesConnectable={!readOnly}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
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
        <Controls position="bottom-left" showInteractive={false} fitViewOptions={FIT_OPTIONS} />
        <MiniMap position="bottom-left" style={MINIMAP_STYLE} pannable zoomable nodeClassName={minimapNodeClass} ariaLabel="Minicarte" />
      </ReactFlow>
      <Legend />
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
