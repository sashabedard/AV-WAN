import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  ControlButton,
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
import { currentMessages, useT } from '../i18n/useT'
import { TEMPLATE_MIME } from '../panels/Palette'
import { analyzeLinks, createFlowCache, toFlowEdges, toFlowNodes, toFlowZones, type CordFlowEdge, type FlowNode } from './toFlow'
import { GRID, mergeEdges, mergeNodes, nodesMatchDerived, snapPoint, syncSelected } from './canvasHelpers'
import { clientPoint, connectionRefs, dropOnDevice, makeIsValidConnection, nodeIdAt, reconnectEnd, dropReconnectOnDevice, dropUnplugs, overPaneAt } from './connect'
import { useAltKey } from './useAltKey'
import { FIT_OPTIONS, pinCurrentView, registerViewport } from './viewport'
import { arrowDelta, nudgeMoves } from './keyboard'
import { isTextInput } from '../app/routeEditCommand'
import { DeviceNode } from './DeviceNode'
import { ZoneNode } from './ZoneNode'
import { memberPositions, selectionMoves, startZoneDrag, type ZoneDrag } from './zoneDrag'
import { ZONE_DEFAULT } from '../model/zones'
import { CordEdge } from './CordEdge'
import { SwitchNode } from './SwitchNode'
import { PinnedLayer } from './PinnedLayer'
import { Legend } from './Legend'
import { QuickSearch } from '../panels/QuickSearch'
import { canvasPointer, centreOf } from './pointer'
import { SwitchConfigurator } from '../panels/SwitchConfigurator'
import { DEFAULT_SWITCH_SPEC } from '../catalog/switch'
import { getTemplate } from '../catalog'
import { isStored } from '../catalog/templateText'
import { libraryTemplate } from '../store/libraryStore'
import { clampPopover } from './popover'
import { useDismissOnOutside } from '../panels/useDismiss'
import { Icon } from '../icons/Icon'
import { registerFlowInstance } from '../dev/e2eHooks'
import { useMountedRef } from './useMountedRef'
import './canvas.css'

const nodeTypes = { device: DeviceNode, switch: SwitchNode, zone: ZoneNode }
const edgeTypes = { cord: CordEdge }
const SNAP_GRID: [number, number] = [GRID, GRID]
const DELETE_KEYS = ['Backspace', 'Delete']
const CONNECTION_LINE_STYLE = { stroke: 'var(--accent)', strokeWidth: 3 }
const PRO_OPTIONS = { hideAttribution: true }
const MULTI_SELECT_KEYS = ['Shift', 'Meta', 'Control']
const MINIMAP_STYLE = { left: 46 }
const RECONNECT_RADIUS = 20
const POPOVER_SIZE = { w: 336, h: 420 }
const isZone = (n: { type?: string }): boolean => n.type === 'zone'
function minimapNodeClass(node: FlowNode): string {
  if (node.type === 'zone') return 'mm-zone'
  return node.type === 'switch' ? 'mm-rack' : 'mm-device'
}

function CanvasInner() {
  const project = useProject()
  const readOnly = useProjectStore((s) => s.readOnly)
  const theme = useThemeMode()
  const { m, lang } = useT()
  const cache = useRef(createFlowCache())
  const analysis = useMemo(() => analyzeLinks(project, theme, lang), [project, theme, lang])
  const derivedNodes = useMemo<FlowNode[]>(() => [...toFlowZones(project, cache.current), ...toFlowNodes(project, analysis, cache.current, lang)], [project, analysis, lang])
  const [nodes, setNodes] = useState(derivedNodes)
  useEffect(() => setNodes((prev) => mergeNodes(derivedNodes, prev)), [derivedNodes])
  const derivedEdges = useMemo(() => toFlowEdges(project, analysis, cache.current, m), [project, analysis, m])
  const [edges, setEdges] = useState(derivedEdges)
  useEffect(() => setEdges((prev) => mergeEdges(derivedEdges, prev)), [derivedEdges])
  const selection = useProjectStore((s) => s.selection)
  useEffect(() => {
    setNodes((ns) => syncSelected(ns, new Set([...selection.deviceIds, ...(selection.zoneIds ?? [])])))
    setEdges((es) => syncSelected(es, new Set(selection.linkIds)))
  }, [selection])
  const onEdgesChange = useCallback((changes: EdgeChange<CordFlowEdge>[]) => setEdges((es) => applyEdgeChanges(changes, es)), [])

  const pendingTemplate = useUiStore((s) => s.pendingTemplateId)
  const pendingSwitch = useUiStore((s) => s.pendingSwitch)
  const pendingZone = useUiStore((s) => s.pendingZone)
  const search = useUiStore((s) => s.search)
  const wrapper = useRef<HTMLDivElement>(null)
  const popover = useRef<HTMLDivElement>(null)
  const cancelSwitch = useCallback(() => uiStore.getState().setPendingSwitch(null), [])
  useDismissOnOutside(popover, pendingSwitch !== null, cancelSwitch)
  const alt = useAltKey()
  const { screenToFlowPosition, fitView, getViewport } = useReactFlow()
  // La vue Baies remplace le canvas : il garde son cadrage pour le retrouver au retour (spec § 8.8).
  const [savedViewport] = useState(() => uiStore.getState().schemaViewport)
  useEffect(() => () => uiStore.getState().setSchemaViewport(getViewport()), [getViewport])
  const onInit = useCallback((instance: ReactFlowInstance<FlowNode, CordFlowEdge>) => {
    registerFlowInstance(instance)
    registerViewport(instance, wrapper.current)
  }, [])

  // Cadrer le contenu à l'ouverture d'un fichier (report du plan 1), une seule fois par document.
  const docId = useProjectStore((s) => s.docId)
  const nodesReady = useNodesInitialized()
  const nodesForDoc = nodesMatchDerived(nodes, derivedNodes)
  const fittedDoc = useRef<number | null>(savedViewport ? docId : null)
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

  const onNodesChange = useCallback((changes: NodeChange<FlowNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns)), [])
  // Glisser : une zone emporte ses membres en direct ; le store reçoit une seule opération à la fin.
  const zoneDrag = useRef<ZoneDrag | null>(null)
  const onNodeDragStart: OnNodeDrag<FlowNode> = useCallback((_e, _node, dragged) => {
    zoneDrag.current = startZoneDrag(projectStore.getState().history.present, dragged)
  }, [])
  const onNodeDrag: OnNodeDrag<FlowNode> = useCallback((_e, _node, dragged) => {
    const zd = zoneDrag.current
    if (!zd) return
    const moved = memberPositions(zd, dragged)
    if (moved.size === 0) return
    setNodes((ns) =>
      ns.map((n) => {
        const pos = moved.get(n.id)
        return pos ? { ...n, position: pos } : n
      })
    )
  }, [])
  const onNodeDragStop: OnNodeDrag<FlowNode> = useCallback((_e, _node, dragged) => {
    const zd = zoneDrag.current
    zoneDrag.current = null
    projectStore.getState().moveSelection(selectionMoves(zd, dragged))
  }, [])
  // Au retour de la vue Baies, le canvas remonte : sa sélection vide du montage ne doit pas effacer celle du projet.
  const mounted = useMountedRef()
  const onSelectionChange = useCallback(({ nodes: ns, edges: es }: OnSelectionChangeParams<FlowNode, CordFlowEdge>) => {
    if (!mounted.current) return
    if (ns.length + es.length > 0) uiStore.getState().setInspectVlan(null)
    projectStore.getState().setSelection({
      deviceIds: ns.filter((n) => !isZone(n)).map((n) => n.id),
      linkIds: es.map((e) => e.id),
      zoneIds: ns.filter(isZone).map((n) => n.id)
    })
  }, [mounted])
  const onDelete = useCallback(({ nodes: ns, edges: es }: { nodes: FlowNode[]; edges: CordFlowEdge[] }) => {
    projectStore.getState().removeElements(
      ns.filter((n) => !isZone(n)).map((n) => n.id),
      es.map((e) => e.id),
      ns.filter(isZone).map((n) => n.id)
    )
  }, [])

  const isValidConnection = useMemo(
    () =>
      makeIsValidConnection(
        () => projectStore.getState().history.present,
        () => uiStore.getState().reconnectingLinkId,
        () => uiStore.getState().pointerOverPinned
      ),
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
    const s = projectStore.getState()
    // onConnectEnd part avant onReconnectEnd : l'identifiant du câble est encore là.
    const reconnecting = uiStore.getState().reconnectingLinkId
    if (reconnecting && dropUnplugs(reconnecting, targetId, overPaneAt(document, point), uiStore.getState().pointerOverPinned)) {
      s.removeElements([], [reconnecting])
      const undo = window.avwan?.platform === 'darwin' ? '⌘Z' : 'Ctrl+Z'
      s.showToast(currentMessages().app.toast.cableUnplugged({ undo }))
      return
    }
    if (!targetId) return
    const from = { deviceId: state.fromNode.id, portId: state.fromHandle.id }
    if (reconnecting) {
      const r = dropReconnectOnDevice(s.history.present, reconnecting, from, targetId)
      if (r.ok) s.reconnect(reconnecting, r.end, r.to)
      else if (r.message) s.showToast(r.message)
      return
    }
    const res = dropOnDevice(s.history.present, from, targetId)
    if (res.ok) s.connect(from, res.to)
    else if (res.message) s.showToast(res.message)
  }, [])

  const place = useCallback(
    (templateId: string, client: { x: number; y: number }, alt = false) => {
      const position = snapPoint(screenToFlowPosition(client), project.settings.snapToGrid && !alt)
      if (templateId === 'switch') {
        uiStore.getState().setPendingSwitch({ position, screen: client })
        return
      }
      const s = projectStore.getState()
      // Composante perso : celle du projet si elle y est, sinon celle de la bibliothèque, embarquée au placement.
      const template = getTemplate(s.history.present, templateId) ?? libraryTemplate(templateId)
      if (!template) {
        s.showToast(currentMessages().canvas.view.templateGone)
        return
      }
      s.addDevice(templateId, position, isStored(template) ? { template } : undefined)
    },
    [screenToFlowPosition, project.settings.snapToGrid]
  )
  // Le curseur est suivi sur tout le canvas (⌘K au-dessus d'un nœud place sous le curseur).
  const onMouseMove = useCallback((e: ReactMouseEvent) => {
    canvasPointer.client = { x: e.clientX, y: e.clientY }
  }, [])
  const onMouseLeave = useCallback(() => {
    canvasPointer.client = null
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
  const onNodeMouseEnter = useCallback((_e: ReactMouseEvent, node: FlowNode) => {
    if (!isZone(node)) uiStore.getState().setHoverDevice(node.id)
  }, [])
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
      const ui = uiStore.getState()
      if (ui.pendingZone) {
        ui.setPendingZone(false)
        const at = snapPoint(screenToFlowPosition({ x: e.clientX, y: e.clientY }), project.settings.snapToGrid && !e.altKey)
        projectStore.getState().addZone({ x: at.x, y: at.y, w: ZONE_DEFAULT.w, h: ZONE_DEFAULT.h })
        return
      }
      const id = ui.pendingTemplateId
      if (!id) return
      ui.setPendingTemplate(null)
      place(id, { x: e.clientX, y: e.clientY }, e.altKey)
    },
    [place, screenToFlowPosition, project.settings.snapToGrid]
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        uiStore.getState().setPendingTemplate(null)
        uiStore.getState().setPendingSwitch(null)
        uiStore.getState().setPendingZone(false)
        uiStore.getState().setFocusVlan(null)
        return
      }
      const delta = arrowDelta(e.key, e.shiftKey)
      if (!delta || e.metaKey || e.ctrlKey || e.altKey || isTextInput(document.activeElement)) return
      const s = projectStore.getState()
      const zoneIds = s.selection.zoneIds ?? []
      if (s.readOnly || s.selection.deviceIds.length + zoneIds.length === 0) return
      e.preventDefault()
      s.moveSelection({ devices: nudgeMoves(s.history.present, s.selection.deviceIds, delta), zones: zoneIds.map((id) => ({ id, ...delta })) })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const placing = pendingTemplate !== null || pendingZone
  return (
    <div
      ref={wrapper}
      className={`canvas${placing ? ' canvas--placing' : ''}${project.settings.colorMode === 'port' ? ' canvas--port' : ''}`}
      onDoubleClick={onDoubleClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <ReactFlow<FlowNode, CordFlowEdge>
        nodes={nodes}
        onInit={onInit}
        {...(savedViewport ? { defaultViewport: savedViewport } : {})}
        multiSelectionKeyCode={MULTI_SELECT_KEYS}
        disableKeyboardA11y
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
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
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
        <Controls position="bottom-left" showInteractive={false} fitViewOptions={FIT_OPTIONS}>
          <ControlButton onClick={pinCurrentView} title={m.canvas.view.pinWithKey} aria-label={m.canvas.view.pin}>
            <Icon name="pin" size={14} />
          </ControlButton>
        </Controls>
        <MiniMap position="bottom-left" style={MINIMAP_STYLE} pannable zoomable nodeClassName={minimapNodeClass} ariaLabel={m.canvas.view.minimap} />
      </ReactFlow>
      <Legend />
      {pendingSwitch && (
        <div
          ref={popover}
          className="popover"
          style={(() => {
            const pos = clampPopover(pendingSwitch.screen, POPOVER_SIZE, { w: window.innerWidth, h: window.innerHeight })
            return { left: pos.left, top: pos.top }
          })()}
        >
          <SwitchConfigurator
            initial={DEFAULT_SWITCH_SPEC}
            submitLabel={m.canvas.view.create}
            onCancel={cancelSwitch}
            onSubmit={(spec) => {
              projectStore.getState().addDevice('switch', pendingSwitch.position, { switchSpec: spec })
              cancelSwitch()
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
    <>
      <ReactFlowProvider>
        <CanvasInner />
      </ReactFlowProvider>
      {/* À côté du canvas principal, pas dedans : rien de la vignette n'y remonte (spec 2026-10-14 § 3.3). */}
      <PinnedLayer />
    </>
  )
}
