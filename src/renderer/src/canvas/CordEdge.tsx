import { memo, useState } from 'react'
import { EdgeLabelRenderer, Position, getSmoothStepPath, getStraightPath, type EdgeProps } from '@xyflow/react'
import type { Side } from '../model/types'
import type { CordFlowEdge } from './toFlow'
import { bandRects, bootRect } from './cordGeometry'

const RADIUS = 9
const STUB = 14

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
  if (!data) return null
  const { style, link, tag } = data
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
        offset: STUB,
        ...(link.elbow ? { centerX: (sourceX + targetX) / 2 + link.elbow.dx, centerY: (sourceY + targetY) / 2 + link.elbow.dy } : {})
      })
  const ends: Array<[number, number, Side]> = [
    [sourceX, sourceY, sideOf(sourcePosition)],
    [targetX, targetY, sideOf(targetPosition)]
  ]
  const showTag = selected || hover
  return (
    <>
      <g className={`cord${selected ? ' cord--selected' : ''}`} data-testid={`cord-${link.cableId}`}>
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
        <path d={path} className="cord__hit" strokeWidth={16} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} />
      </g>
      {(showTag || style.badge) && (
        <EdgeLabelRenderer>
          <div
            className={`cord-tag${showTag ? '' : ' cord-tag--badge'}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {showTag ? `${tag}${style.extraBands > 0 ? ` · +${style.extraBands} VLAN` : ''}` : style.badge}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const CordEdge = memo(CordEdgeImpl)
