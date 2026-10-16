import { memo, type MouseEvent } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import type { RackNodeData } from './toRackFlow'
import { RACK_RAIL_W, RACK_TITLE_H, RACK_U_PX } from './rackLayout'
import { projectStore } from '../store/projectStore'
import { useT } from '../i18n/useT'

// Clic sur le titre : la baie devient la sélection ; Maj, ⌘ ou Ctrl l'ajoute ou la retire, comme dans le canvas.
function selectRack(id: string, e: MouseEvent): void {
  const s = projectStore.getState()
  const additive = e.shiftKey || e.metaKey || e.ctrlKey
  if (!additive) {
    s.setSelection({ deviceIds: [], linkIds: [], rackIds: [id] })
    return
  }
  const current = s.selection.rackIds ?? []
  s.setSelection({ ...s.selection, rackIds: current.includes(id) ? current.filter((r) => r !== id) : [...current, id] })
}

function RackNodeImpl({ id, data, selected, width, height }: NodeProps<Node<RackNodeData, 'rack'>>) {
  const { m } = useT()
  const { rack, zoneName, free } = data
  const w = width ?? 0
  const h = height ?? 0
  const bodyH = h - RACK_TITLE_H
  const meta = [zoneName, m.racks.units({ n: rack.heightU })].filter(Boolean).join(' · ')
  const hatch = `rack-hatch-${id}`
  const units = Array.from({ length: rack.heightU }, (_, i) => rack.heightU - i)
  return (
    <div className={`rack${selected ? ' rack--selected' : ''}`} style={{ width: w, height: h }} data-testid={`rack-${rack.name}`}>
      <div className="rack__title" style={{ height: RACK_TITLE_H }} title={m.racks.selectRack({ name: rack.name })} onClick={(e) => selectRack(id, e)}>
        <span className="rack__name">{rack.name}</span>
        <span className="rack__meta"> · {meta}</span>
      </div>
      <svg className="rack__body" width={w} height={bodyH} style={{ top: RACK_TITLE_H }} aria-hidden="true">
        <defs>
          <pattern id={hatch} width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line className="rack__hatch-line" x1={0} y1={0} x2={0} y2={8} />
          </pattern>
        </defs>
        <rect className="rack__inside" x={RACK_RAIL_W} y={0} width={w - 2 * RACK_RAIL_W} height={bodyH} />
        {free.map((f) => (
          <g key={f.y}>
            <rect className="rack__free" x={RACK_RAIL_W + 2} y={f.y - RACK_TITLE_H + 2} width={w - 2 * RACK_RAIL_W - 4} height={f.h - 4} fill={`url(#${hatch})`} />
            <text className="rack__free-text" x={w / 2} y={f.y - RACK_TITLE_H + f.h / 2} textAnchor="middle" dominantBaseline="central">
              {m.racks.free({ n: f.n })}
            </text>
          </g>
        ))}
        {[0, w - RACK_RAIL_W].map((x) => (
          <rect key={x} className="rack__rail" x={x} y={0} width={RACK_RAIL_W} height={bodyH} />
        ))}
        {units.map((u, i) => (
          <g key={u}>
            {i > 0 && <line className="rack__tick" x1={0} y1={i * RACK_U_PX} x2={RACK_RAIL_W} y2={i * RACK_U_PX} />}
            {i > 0 && <line className="rack__tick" x1={w - RACK_RAIL_W} y1={i * RACK_U_PX} x2={w} y2={i * RACK_U_PX} />}
            <text className="rack__u" x={RACK_RAIL_W / 2} y={i * RACK_U_PX + RACK_U_PX / 2} textAnchor="middle" dominantBaseline="central">
              {u}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export const RackNode = memo(RackNodeImpl)
