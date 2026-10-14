import { useEffect, useMemo, useRef, useState } from 'react'
import { ConnectionMode, ReactFlow, ViewportPortal, useNodesInitialized, useReactFlow } from '@xyflow/react'
import type { Project, Side, Zone } from '../model/types'
import { type CordFlowEdge, type FlowNode } from '../canvas/toFlow'
import { useStaticFlow } from '../canvas/useStaticFlow'
import { StaticViewContext } from '../canvas/staticView'
import { DeviceNode } from '../canvas/DeviceNode'
import { SwitchNode } from '../canvas/SwitchNode'
import { ZoneNode } from '../canvas/ZoneNode'
import { CordEdge } from '../canvas/CordEdge'
import { zoneSheet } from '../reports/zoneSheet'
import { layoutStubs, unionRect, type Stub, type StubInput } from './renvoiLayout'
import '../canvas/canvas.css'

const nodeTypes = { device: DeviceNode, switch: SwitchNode, zone: ZoneNode }
const edgeTypes = { cord: CordEdge }
const PRO_OPTIONS = { hideAttribution: true }
const PADDING = 0.04

const SIDES: Record<string, Side> = { top: 'top', bottom: 'bottom', left: 'left', right: 'right' }

// Le canvas pour l'impression : mêmes nœuds et cordons, aucune interaction (spec § 11.1). Cadre tout
// le projet, ou une zone (seulement ses appareils et ses câbles, avec des renvois pour ceux qui sortent),
// puis appelle onReady une seule fois. `pages` : numéro de page de chaque zone qui a la sienne.
export function StaticDiagram({ project, zone, pages, onReady }: { project: Project; zone?: Zone; pages: Map<string, number>; onReady: () => void }) {
  const flowAll = useStaticFlow(project, 'light')
  const sheet = useMemo(() => (zone ? zoneSheet(project, zone, pages) : null), [project, zone, pages])
  const nodes = useMemo(
    () => (zone && sheet ? flowAll.nodes.filter((n) => n.id === zone.id || sheet.deviceIds.has(n.id)) : flowAll.nodes),
    [flowAll.nodes, zone, sheet]
  )
  const edges = useMemo(() => (sheet ? flowAll.edges.filter((e) => sheet.linkIds.has(e.id)) : flowAll.edges), [flowAll.edges, sheet])
  const { onNodesChange } = flowAll
  const initialized = useNodesInitialized()
  const flow = useReactFlow<FlowNode, CordFlowEdge>()
  const [stubs, setStubs] = useState<Stub[]>([])
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
    let fit: Promise<unknown>
    if (zone && sheet) {
      // Port intérieur de chaque renvoi : position exacte lue sur les poignées mesurées.
      const inputs: StubInput[] = []
      for (const r of sheet.renvois) {
        const internal = flow.getInternalNode(r.deviceId)
        const bounds = internal?.internals.handleBounds
        const h = [...(bounds?.source ?? []), ...(bounds?.target ?? [])].find((x) => x.id === r.portId)
        if (!internal || !h) continue
        const side = SIDES[h.position]
        if (!side) continue
        inputs.push({
          key: `${r.linkId}|${r.deviceId}|${r.portId}`,
          linkId: r.linkId,
          deviceId: r.deviceId,
          x: internal.internals.positionAbsolute.x + h.x + h.width / 2,
          y: internal.internals.positionAbsolute.y + h.y + h.height / 2,
          side,
          node: { x: internal.internals.positionAbsolute.x, y: internal.internals.positionAbsolute.y, w: internal.measured.width ?? 0, h: internal.measured.height ?? 0 },
          label: r.label
        })
      }
      const laid = layoutStubs(inputs)
      setStubs(laid)
      const box = unionRect(
        zone.rect,
        laid.map((s) => s.box)
      )
      fit = flow.fitBounds({ x: box.x, y: box.y, width: box.w, height: box.h }, { padding: PADDING })
    } else {
      fit = flow.fitView({ padding: PADDING, maxZoom: 1 })
    }
    void fit.then(
      () => onReady(),
      () => onReady()
    )
  }, [initialized, nodes.length, zone, sheet, project, flow, onReady])
  const styleOf = (linkId: string) => flowAll.edges.find((e) => e.id === linkId)?.data?.style
  const detail = !zone ? project.zones.filter((z) => pages.has(z.id)) : []
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
      >
        <ViewportPortal>
          {detail.map((z) => (
            <div key={z.id} className="renvoi renvoi--detail" style={{ transform: `translate(-100%, 0) translate(${z.rect.x + z.rect.w - 10}px, ${z.rect.y + 8}px)` }}>
              Détail p. {pages.get(z.id)}
            </div>
          ))}
          {stubs.length > 0 && (
            <svg className="renvoi-stubs" width={1} height={1}>
              {stubs.map((s) => {
                const st = styleOf(s.linkId)
                return (
                  <line
                    key={s.key}
                    x1={s.x1}
                    y1={s.y1}
                    x2={s.x2}
                    y2={s.y2}
                    stroke={st?.color ?? '#8A847A'}
                    strokeWidth={st?.width ?? 3}
                    {...(st?.dash ? { strokeDasharray: st.dash } : {})}
                  />
                )
              })}
            </svg>
          )}
          {stubs.map((s) => (
            <div key={s.key} className="renvoi" style={{ transform: `translate(${s.box.x}px, ${s.box.y}px)`, width: s.box.w, height: s.box.h }}>
              {s.label}
            </div>
          ))}
        </ViewportPortal>
      </ReactFlow>
    </StaticViewContext.Provider>
  )
}
