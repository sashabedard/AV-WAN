import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  ConnectionMode,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useNodesInitialized,
  useReactFlow,
  type EdgeChange,
  type NodeChange,
  type OnNodeDrag,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
  type Viewport
} from '@xyflow/react'
import { projectStore, useProject, useProjectStore, type Selection } from '../store/projectStore'
import { uiStore } from '../store/uiStore'
import { useThemeMode } from '../theme/useThemeMode'
import { useT } from '../i18n/useT'
import { DEFAULT_RACK_HEIGHT } from '../model/racks'
import { useCableHandlers } from '../canvas/useCableHandlers'
import type { CordFlowEdge } from '../canvas/toFlow'
import { mergeEdges, mergeNodes, nodesMatchDerived, syncSelected } from '../canvas/canvasHelpers'
import { FIT_OPTIONS, registerViewport } from '../canvas/viewport'
import { useMountedRef } from '../canvas/useMountedRef'
import { CordEdge } from '../canvas/CordEdge'
import { SwitchNode } from '../canvas/SwitchNode'
import { Legend } from '../canvas/Legend'
import { RackNode } from './RackNode'
import { RackDeviceNode } from './RackDeviceNode'
import { StubNode } from './StubNode'
import { toRackFlow, type RackFlowNode } from './toRackFlow'
import { RACK_U_PX, rackAt } from './rackLayout'
import { DEVICE_MIME, rackViewDelete } from './rackDelete'
import { UnplacedList } from './UnplacedList'
import '../canvas/canvas.css'
import './racks.css'

const nodeTypes = { rack: RackNode, switch: SwitchNode, rackDevice: RackDeviceNode, stub: StubNode }
const edgeTypes = { cord: CordEdge }
const PRO_OPTIONS = { hideAttribution: true }
const MULTI_SELECT_KEYS = ['Shift', 'Meta', 'Control']
const DELETE_KEYS = ['Backspace', 'Delete']
const RECONNECT_RADIUS = 20
const EMPTY: Selection = { deviceIds: [], linkIds: [] }

const isDevice = (n: RackFlowNode): boolean => n.type === 'switch' || n.type === 'rackDevice'
const selectedNodeIds = (s: Selection): Set<string> => new Set([...s.deviceIds, ...(s.rackIds ?? [])])
const sameSet = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((id) => b.includes(id))

function RackFlow() {
  const project = useProject()
  const theme = useThemeMode()
  const { m } = useT()
  const readOnly = useProjectStore((s) => s.readOnly)
  const derived = useMemo(() => toRackFlow(project, theme, m), [project, theme, m])
  const [nodes, setNodes] = useState(() => syncSelected(derived.nodes, selectedNodeIds(projectStore.getState().selection)))
  useEffect(() => setNodes((prev) => mergeNodes(derived.nodes, prev)), [derived.nodes])
  const [edges, setEdges] = useState(() => syncSelected(derived.edges, new Set(projectStore.getState().selection.linkIds)))
  useEffect(() => setEdges((prev) => mergeEdges(derived.edges, prev)), [derived.edges])
  const selection = useProjectStore((s) => s.selection)
  useEffect(() => {
    setNodes((ns) => syncSelected(ns, selectedNodeIds(selection)))
    setEdges((es) => syncSelected(es, new Set(selection.linkIds)))
  }, [selection])
  const onNodesChange = useCallback((changes: NodeChange<RackFlowNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns)), [])
  const onEdgesChange = useCallback((changes: EdgeChange<CordFlowEdge>[]) => setEdges((es) => applyEdgeChanges(changes, es)), [])

  // Ce que la vue peut montrer de la sélection du store (un appareil hors baie, une zone n'y sont pas).
  const visible = useRef({ nodes: new Set<string>(), edges: new Set<string>() })
  useLayoutEffect(() => {
    visible.current = { nodes: new Set(derived.nodes.filter((n) => n.type !== 'stub').map((n) => n.id)), edges: new Set(derived.edges.map((e) => e.id)) }
  }, [derived])
  const mounted = useMountedRef()
  const onSelectionChange = useCallback(({ nodes: ns, edges: es }: OnSelectionChangeParams<RackFlowNode, CordFlowEdge>) => {
    if (!mounted.current) return
    const s = projectStore.getState()
    const v = visible.current
    const nodeIds = ns.map((n) => n.id)
    const edgeIds = es.map((e) => e.id)
    // Écho de la sélection posée par le store : on la garde entière, avec ce que la vue ne montre pas.
    const shown = [...selectedNodeIds(s.selection)].filter((id) => v.nodes.has(id))
    const shownEdges = s.selection.linkIds.filter((id) => v.edges.has(id))
    if (sameSet(nodeIds, shown) && sameSet(edgeIds, shownEdges)) return
    if (ns.length + es.length > 0) uiStore.getState().setInspectVlan(null)
    s.setSelection({ deviceIds: ns.filter(isDevice).map((n) => n.id), linkIds: edgeIds, rackIds: ns.filter((n) => n.type === 'rack').map((n) => n.id) })
  }, [mounted])
  // Clic dans le vide (ou sur le corps d'une baie) : vide aussi la part de la sélection que la vue ne montre pas.
  const onPaneClick = useCallback(() => {
    const s = projectStore.getState()
    const sel = s.selection
    if (sel.deviceIds.length + sel.linkIds.length + (sel.zoneIds?.length ?? 0) + (sel.rackIds?.length ?? 0) > 0) s.setSelection(EMPTY)
  }, [])
  const onNodeMouseEnter = useCallback((_e: ReactMouseEvent, node: RackFlowNode) => {
    if (isDevice(node)) uiStore.getState().setHoverDevice(node.id)
  }, [])
  const onNodeMouseLeave = useCallback(() => uiStore.getState().setHoverDevice(null), [])

  const cable = useCableHandlers()
  const { screenToFlowPosition } = useReactFlow()
  // Un dépôt refusé ou hors baie : le nœud revient à sa place (les positions viennent du projet).
  const [dropTick, setDropTick] = useState(0)
  useEffect(() => {
    if (dropTick > 0) setNodes((prev) => mergeNodes(derived.nodes, prev))
  }, [dropTick, derived.nodes])
  const onNodeDragStop: OnNodeDrag<RackFlowNode> = useCallback((_e, node) => {
    const s = projectStore.getState()
    const device = s.history.present.devices.find((d) => d.id === node.id)
    if (device) {
      const heightU = device.rack?.heightU ?? 1
      const h = heightU * RACK_U_PX
      const hit = rackAt(s.history.present, { x: node.position.x + 20, y: node.position.y + h - RACK_U_PX / 2 }, heightU)
      if (hit && (hit.rackId !== device.rack?.rackId || hit.u !== device.rack?.u)) s.placeInRack(device.id, hit.rackId, hit.u)
    }
    setDropTick((t) => t + 1)
  }, [])
  const onDragOver = useCallback((e: DragEvent) => {
    if (!e.dataTransfer.types.includes(DEVICE_MIME)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])
  const onDrop = useCallback(
    (e: DragEvent) => {
      const id = e.dataTransfer.getData(DEVICE_MIME)
      if (!id) return
      e.preventDefault()
      const s = projectStore.getState()
      const device = s.history.present.devices.find((d) => d.id === id)
      if (!device) return
      const hit = rackAt(s.history.present, screenToFlowPosition({ x: e.clientX, y: e.clientY }), device.rack?.heightU ?? 1)
      if (hit) s.placeInRack(id, hit.rackId, hit.u)
    },
    [screenToFlowPosition]
  )
  // Suppr : un appareil quitte sa baie, un câble est supprimé, une baie est supprimée — une seule étape d'annulation.
  const onBeforeDelete = useCallback(async () => {
    const s = projectStore.getState()
    const plan = rackViewDelete(s.selection)
    if (plan.unplace.length + plan.removeLinks.length + plan.removeRacks.length > 0) s.removeInRackView(plan)
    return false
  }, [])

  // Cadrage propre à la vue (spec § 8.8) : rétabli au montage, gardé à la fin de chaque déplacement,
  // cadré sur les baies au premier affichage d'un document. Les commandes Zoom du menu suivent cette vue ;
  // les crochets e2e restent ceux du schéma (pas de registerFlowInstance ici).
  const [initialViewport] = useState(() => uiStore.getState().racksViewport)
  const { fitView } = useReactFlow()
  const onInit = useCallback((instance: ReactFlowInstance<RackFlowNode, CordFlowEdge>) => registerViewport(instance), [])
  const onMoveEnd = useCallback((_e: MouseEvent | TouchEvent | null, vp: Viewport) => uiStore.getState().setRacksViewport({ x: vp.x, y: vp.y, zoom: vp.zoom }), [])
  const docId = useProjectStore((s) => s.docId)
  const nodesReady = useNodesInitialized()
  const nodesForDoc = nodesMatchDerived(nodes, derived.nodes)
  const fittedDoc = useRef<number | null>(initialViewport ? docId : null)
  useEffect(() => {
    if (fittedDoc.current === docId || !nodesReady || !nodesForDoc) return
    fittedDoc.current = docId
    void fitView(FIT_OPTIONS)
  }, [docId, nodesReady, nodesForDoc, fitView])

  return (
    <div className={`racks${project.settings.colorMode === 'port' ? ' canvas--port' : ''}`} role="region" aria-label={m.racks.viewLabel}>
      <UnplacedList disabled={readOnly} />
      <div className="racks__flow">
      <ReactFlow<RackFlowNode, CordFlowEdge>
        id="racks"
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={onSelectionChange}
        onPaneClick={onPaneClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onMoveEnd={onMoveEnd}
        {...(initialViewport ? { defaultViewport: initialViewport } : {})}
        connectionMode={ConnectionMode.Loose}
        onNodeDragStop={onNodeDragStop}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onConnect={cable.onConnect}
        onConnectEnd={cable.onConnectEnd}
        isValidConnection={cable.isValidConnection}
        onReconnectStart={cable.onReconnectStart}
        onReconnect={cable.onReconnect}
        onReconnectEnd={cable.onReconnectEnd}
        onBeforeDelete={onBeforeDelete}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        edgesReconnectable={!readOnly}
        reconnectRadius={RECONNECT_RADIUS}
        deleteKeyCode={readOnly ? null : DELETE_KEYS}
        elevateNodesOnSelect={false}
        multiSelectionKeyCode={MULTI_SELECT_KEYS}
        disableKeyboardA11y
        zoomOnDoubleClick={false}
        minZoom={0.2}
        maxZoom={2.5}
        colorMode={theme}
        proOptions={PRO_OPTIONS}
      >
        <Controls position="bottom-left" showInteractive={false} fitViewOptions={FIT_OPTIONS} />
        <Panel position="top-left">
          <AddRackButton disabled={readOnly} />
        </Panel>
      </ReactFlow>
      <Legend />
      </div>
    </div>
  )
}

function AddRackButton({ disabled }: { disabled: boolean }) {
  const { m } = useT()
  return (
    <button type="button" className="btn racks__add" disabled={disabled} title={m.racks.addTitle({ n: DEFAULT_RACK_HEIGHT })} onClick={() => projectStore.getState().addRack()}>
      {m.racks.add}
    </button>
  )
}

// Vue Baies : élévations côte à côte, façades, câbles et bouts de câble vers l'extérieur.
// Seconde instance React Flow, indépendante du schéma (cadrage, nœuds), même store et même sélection.
export function RackView() {
  const { m } = useT()
  const hasRacks = useProjectStore((s) => (s.history.present.racks?.length ?? 0) > 0)
  const readOnly = useProjectStore((s) => s.readOnly)
  if (!hasRacks)
    return (
      <div className="racks racks--empty" role="region" aria-label={m.racks.viewLabel}>
        <div className="racks__empty">
          <p className="racks__empty-text">{m.racks.empty}</p>
          <AddRackButton disabled={readOnly} />
        </div>
      </div>
    )
  return (
    <ReactFlowProvider>
      <RackFlow />
    </ReactFlowProvider>
  )
}
