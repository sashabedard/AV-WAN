import { memo, useEffect, useMemo, useState } from 'react'
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react'
import type { DeviceFlowNode } from './toFlow'
import { switchFacade } from './switchFacade'
import { switchSummary } from '../catalog/switch'
import { usePortCompatibility } from './useConnectingFrom'
import { projectStore, useProjectStore } from '../store/projectStore'
import { InlineName } from './InlineName'

function SwitchNodeImpl({ id, data, selected }: NodeProps<DeviceFlowNode>) {
  const { device, ports, poeUsage } = data
  const readOnly = useProjectStore((s) => s.readOnly)
  const [renaming, setRenaming] = useState(false)
  const facade = useMemo(() => switchFacade(device.ports), [device.ports])
  const compat = usePortCompatibility(id)
  const updateInternals = useUpdateNodeInternals()
  useEffect(() => {
    updateInternals(id)
  }, [id, facade, updateInternals])
  const title = `${device.name} · ${device.switch ? switchSummary(device.switch) : 'Switch'}`
  const tapeWidth = title.length * 5.8 + 12
  const gradientId = `swg-${id}`
  const { width, height } = facade
  return (
    <div className={`sw${selected ? ' sw--selected' : ''}`} style={{ width, height }} data-testid={`device-${device.name}`}>
      <svg className="sw__svg" width={width} height={height} aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--panel-top)' }} />
            <stop offset="1" style={{ stopColor: 'var(--panel-bottom)' }} />
          </linearGradient>
        </defs>
        <rect className="sw__ear" x={0} y={0} width={12} height={height} rx={2} />
        <rect className="sw__ear" x={width - 12} y={0} width={12} height={height} rx={2} />
        <rect className="sw__panel" x={10} y={0} width={width - 20} height={height} rx={3} fill={`url(#${gradientId})`} />
        {[
          [6, 12],
          [6, height - 12],
          [width - 6, 12],
          [width - 6, height - 12]
        ].map(([cx, cy], i) => (
          <circle key={i} className="sw__screw" cx={cx} cy={cy} r={2} />
        ))}
        <g transform={`rotate(-0.6 ${width / 2} 13)`}>
          <rect className="sw__tape" x={20} y={6} width={tapeWidth} height={14} rx={1} />
          <text className="sw__tape-text" x={26} y={16.5}>
            {title}
          </text>
        </g>
        {poeUsage?.budgetW !== undefined && (
          <text className="sw__poe" x={width - 22} y={17} textAnchor="end">
            PoE {poeUsage.usedW} / {poeUsage.budgetW} W
          </text>
        )}
        {facade.ports.map((p) => {
          const info = ports[p.id]
          const rj = p.kind === 'rj45'
          const ledClass = info ? (info.poe ? 'sw__led sw__led--poe' : 'sw__led sw__led--link') : 'sw__led'
          const numberY = facade.twoRows && p.row === 'top' ? p.y - 8 : p.y + p.h + 9
          return (
            <g key={p.id}>
              {rj ? (
                <path className="sw__port" d={`M${p.x},${p.y}h${p.w}v${p.h}h-4v2h-6v-2h-4z`} />
              ) : (
                <rect className="sw__port sw__port--sfp" x={p.x} y={p.y} width={p.w} height={p.h} rx={1} />
              )}
              {info && (
                <rect
                  x={p.x + (rj ? 3 : 4)}
                  y={p.y + (rj ? 3 : 2)}
                  width={rj ? 8 : 10}
                  height={rj ? 10 : 6}
                  rx={1.5}
                  style={{ fill: info.color }}
                />
              )}
              <circle className={ledClass} cx={p.x + p.w / 2} cy={p.y - 4} r={1.6} />
              <text className="sw__num" x={p.x + p.w / 2} y={numberY} textAnchor="middle">
                {p.label}
              </text>
            </g>
          )
        })}
      </svg>
      {renaming ? (
        <InlineName
          value={device.name}
          label="Nom de l’appareil"
          className="inline-name--rack"
          onCommit={(name) => projectStore.getState().updateDevice(id, { name })}
          onDone={() => setRenaming(false)}
        />
      ) : (
        <div
          className="sw__tape-hit"
          style={{ width: tapeWidth }}
          title={readOnly ? title : `${title} · double-clic pour renommer`}
          onDoubleClick={(e) => {
            if (readOnly) return
            e.stopPropagation()
            setRenaming(true)
          }}
        />
      )}
      {facade.ports.map((p) => {
        const state = compat(p.id)
        return (
          <Handle
            key={p.id}
            id={p.id}
            type="source"
            position={facade.twoRows && p.row === 'top' ? Position.Top : Position.Bottom}
            className={`sw__handle${state ? ` port--${state}` : ''}`}
            style={{ left: p.x, top: p.y, width: p.w, height: p.h, transform: 'none' }}
            title={`Port ${p.label}`}
          />
        )
      })}
    </div>
  )
}

export const SwitchNode = memo(SwitchNodeImpl)
