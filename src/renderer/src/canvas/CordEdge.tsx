import { memo, useRef, useState } from 'react'
import { EdgeLabelRenderer, Position, getSmoothStepPath, getStraightPath, useStore as useFlowStore, type EdgeProps } from '@xyflow/react'
import type { Side } from '../model/types'
import type { CordFlowEdge } from './toFlow'
import { useEffectiveFocus } from './useEffectiveFocus'
import { useLocked } from './staticView'
import { useUiStore } from '../store/uiStore'
import { projectStore } from '../store/projectStore'
import { useT } from '../i18n/useT'
import { BOLT_PATH, badgePoint, bandReach, bandRects, beside, bootRect, elbowFromDrag, outward, stubLength, wavesPath } from './cordGeometry'

const RADIUS = 9

function sideOf(position: Position): Side {
  switch (position) {
    case Position.Top:
      return 'top'
    case Position.Bottom:
      return 'bottom'
    case Position.Left:
      return 'left'
    default:
      return 'right'
  }
}

type Elbow = { dx: number; dy: number }
const NO_ELBOW: Elbow = { dx: 0, dy: 0 }

// Poignée au milieu d'un câble sélectionné : glisser pour décaler le coude, double-clic pour le recentrer.
function ElbowGrip({ x, y, start, onDraft, onCommit, onReset }: { x: number; y: number; start: Elbow; onDraft: (e: Elbow | null) => void; onCommit: (e: Elbow) => void; onReset: () => void }) {
  const { m } = useT()
  const zoom = useFlowStore((s) => s.transform[2])
  const origin = useRef<{ x: number; y: number } | null>(null)
  const at = (e: { clientX: number; clientY: number }): Elbow =>
    elbowFromDrag(start, { x: e.clientX - (origin.current?.x ?? e.clientX), y: e.clientY - (origin.current?.y ?? e.clientY) }, zoom)
  const cancel = (): void => {
    if (!origin.current) return
    origin.current = null
    onDraft(null)
  }
  return (
    <EdgeLabelRenderer>
      <div
        className="elbow-grip nodrag nopan"
        style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
        title={m.canvas.cord.elbowGrip}
        onPointerDown={(e) => {
          e.stopPropagation()
          e.currentTarget.setPointerCapture(e.pointerId)
          origin.current = { x: e.clientX, y: e.clientY }
        }}
        onPointerMove={(e) => {
          if (origin.current) onDraft(at(e))
        }}
        onPointerUp={(e) => {
          if (!origin.current) return
          const next = at(e)
          origin.current = null
          onDraft(null)
          if (next.dx !== start.dx || next.dy !== start.dy) onCommit(next)
        }}
        onPointerCancel={cancel}
        onLostPointerCapture={cancel}
        onDoubleClick={(e) => {
          e.stopPropagation()
          onReset()
        }}
      />
    </EdgeLabelRenderer>
  )
}

function CordEdgeImpl({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<CordFlowEdge>) {
  const [hover, setHover] = useState(false)
  const aId = data?.link.a.deviceId
  const bId = data?.link.b.deviceId
  const hot = useUiStore((s) => s.hoverDeviceId !== null && (s.hoverDeviceId === aId || s.hoverDeviceId === bId))
  const focus = useEffectiveFocus()
  const [draft, setDraft] = useState<Elbow | null>(null)
  const locked = useLocked()
  if (!data) return null
  const { style, link, tag, portLabels } = data
  const elbow = draft ?? link.elbow
  const [path, labelX, labelY] = style.straight
    ? getStraightPath({ sourceX, sourceY, targetX, targetY })
    : getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: RADIUS,
        offset: stubLength(style.bands.length) + Math.max(...data.exits),
        ...(elbow ? { centerX: (sourceX + targetX) / 2 + elbow.dx, centerY: (sourceY + targetY) / 2 + elbow.dy } : {})
      })
  const ends: Array<[number, number, Side]> = [
    [sourceX, sourceY, sideOf(sourcePosition)],
    [targetX, targetY, sideOf(targetPosition)]
  ]
  // Bagues, éclair et « +n » se mesurent depuis le bord extérieur du nœud, pas depuis la poignée (sur un port de façade, elle est dans la façade).
  const marks = ends.map(([x, y, side], i): [number, number, Side] => {
    const p = beside(x, y, side, data.exits[i] ?? 0, 0)
    return [p.x, p.y, side]
  })
  const dim = focus !== null && !data.vlans.includes(focus)
  // Le badge de support va sur la sortie du port cible : le milieu d'un cordon court contourne la tuile et tombe dessus.
  const badgeAt = style.straight ? { x: labelX, y: labelY } : badgePoint(targetX, targetY, ends[1]![2], data.exits[1] ?? 0, style.bands.length)
  const showTag = selected || hover || hot || style.alwaysTag
  const grip = selected && !style.straight && !locked
  return (
    <>
      <g className={`cord${selected ? ' cord--selected' : ''}${dim ? ' cord--dim' : ''}${hot ? ' cord--hot' : ''}`} data-testid={`cord-${link.cableId}`}>
        {selected && <path d={path} className="cord__halo" strokeWidth={style.width + 7} />}
        {style.plugs && <path d={path} className="cord__shadow" strokeWidth={style.width + 3} transform="translate(0 1.5)" />}
        <path d={path} className="cord__main" stroke={style.color} strokeWidth={style.width} strokeDasharray={style.dash} />
        {style.innerDash && <path d={path} className="cord__inner" strokeWidth={0.9} strokeDasharray="5 3" />}
        {style.plugs &&
          ends.map(([x, y, side], i) => {
            const r = bootRect(x, y, side)
            return <rect key={`boot-${i}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={1.5} fill={style.color} />
          })}
        {style.bands.length > 0 &&
          marks.flatMap(([x, y, side], i) =>
            bandRects(x, y, side, style.bands, style.width).map((b, j) => (
              <rect key={`band-${i}-${j}`} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.color} />
            ))
          )}
        {data.poeAt &&
          (() => {
            const [x, y, side] = marks[data.poeAt === 'source' ? 0 : 1]!
            const p = beside(x, y, side, Math.max(14, bandReach(style.bands.length) + 10), 9)
            return <path className="cord__bolt" d={BOLT_PATH} transform={`translate(${p.x} ${p.y})`} />
          })()}
        {style.extraBands > 0 &&
          (() => {
            const [x, y, side] = marks[0]!
            const p = beside(x, y, side, bandReach(style.bands.length) + 9, -10)
            return (
              <text className="cord__more" x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central">
                +{style.extraBands}
              </text>
            )
          })()}
        {style.straight && link.medium === 'wifi' && <path className="cord__waves" d={wavesPath(labelX, labelY - 9)} style={{ stroke: style.color }} />}
        <path d={path} className="cord__hit" strokeWidth={16} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} />
      </g>
      {(showTag || style.badge) && (
        <EdgeLabelRenderer>
          <div
            className={`cord-tag${showTag ? '' : ' cord-tag--badge'}${dim ? ' cord-tag--dim' : ''}`}
            style={{ transform: `translate(-50%, ${grip ? '-170%' : '-50%'}) translate(${showTag ? labelX : badgeAt.x}px, ${showTag ? labelY : badgeAt.y}px)` }}
          >
            {showTag ? `${tag}${style.extraBands > 0 ? ` · +${style.extraBands} VLAN` : ''}` : style.badge}
          </div>
          {style.alwaysTag &&
            ends.map(([x, y, side], i) => {
              const d = outward(side)
              return (
                <div
                  key={`end-${i}`}
                  className="cord-end"
                  style={{ transform: `translate(-50%, -50%) translate(${x + d.x * 20}px, ${y + d.y * 20}px)` }}
                >
                  {portLabels[i]}
                </div>
              )
            })}
        </EdgeLabelRenderer>
      )}
      {grip && (
        <ElbowGrip
          x={labelX}
          y={labelY}
          start={link.elbow ?? NO_ELBOW}
          onDraft={setDraft}
          onCommit={(e) => projectStore.getState().updateLink(link.id, { elbow: e })}
          onReset={() => {
            if (link.elbow) projectStore.getState().updateLink(link.id, { elbow: undefined })
          }}
        />
      )}
    </>
  )
}

export const CordEdge = memo(CordEdgeImpl)
