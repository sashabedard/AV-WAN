import { memo, useState } from 'react'
import { EdgeLabelRenderer, Position, getSmoothStepPath, getStraightPath, type EdgeProps } from '@xyflow/react'
import type { Side } from '../model/types'
import type { CordFlowEdge } from './toFlow'
import { useUiStore } from '../store/uiStore'
import { BOLT_PATH, bandReach, bandRects, beside, bootRect, outward, stubLength, wavesPath } from './cordGeometry'

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

function CordEdgeImpl({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }: EdgeProps<CordFlowEdge>) {
  const [hover, setHover] = useState(false)
  const aId = data?.link.a.deviceId
  const bId = data?.link.b.deviceId
  const hot = useUiStore((s) => s.hoverDeviceId !== null && (s.hoverDeviceId === aId || s.hoverDeviceId === bId))
  const focus = useUiStore((s) => s.focusVlan)
  if (!data) return null
  const { style, link, tag, portLabels } = data
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
        offset: stubLength(style.bands.length),
        ...(link.elbow ? { centerX: (sourceX + targetX) / 2 + link.elbow.dx, centerY: (sourceY + targetY) / 2 + link.elbow.dy } : {})
      })
  const ends: Array<[number, number, Side]> = [
    [sourceX, sourceY, sideOf(sourcePosition)],
    [targetX, targetY, sideOf(targetPosition)]
  ]
  const dim = focus !== null && !data.vlans.includes(focus)
  const showTag = selected || hover || hot || style.alwaysTag
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
          ends.flatMap(([x, y, side], i) =>
            bandRects(x, y, side, style.bands, style.width).map((b, j) => (
              <rect key={`band-${i}-${j}`} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.color} />
            ))
          )}
        {data.poeAt &&
          (() => {
            const [x, y, side] = ends[data.poeAt === 'source' ? 0 : 1]!
            const p = beside(x, y, side, Math.max(14, bandReach(style.bands.length) + 10), 9)
            return <path className="cord__bolt" d={BOLT_PATH} transform={`translate(${p.x} ${p.y})`} />
          })()}
        {style.extraBands > 0 &&
          (() => {
            const [x, y, side] = ends[0]!
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
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
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
    </>
  )
}

export const CordEdge = memo(CordEdgeImpl)
