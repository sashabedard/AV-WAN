import { memo, useEffect, useMemo, useState } from 'react'
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react'
import type { DeviceFlowNode } from './toFlow'
import { TAPE_X, facadeLabels, switchFacade } from './switchFacade'
import { switchSummary } from '../catalog/switch'
import { displayName } from '../catalog/templateText'
import { useEffectiveFocus } from './useEffectiveFocus'
import { usePortCompatibility } from './useConnectingFrom'
import { projectStore } from '../store/projectStore'
import { useLocked } from './staticView'
import { isPatchPanel, passThroughPeer, portDisplayLabel } from '../model/rules'
import { useT } from '../i18n/useT'
import { InlineName } from './InlineName'

function SwitchNodeImpl({ id, data, selected }: NodeProps<DeviceFlowNode>) {
  const { device, template, ports, poeUsage } = data
  const { m, lang } = useT()
  const readOnly = useLocked()
  const focus = useEffectiveFocus()
  const dim = focus !== null && !data.vlans.includes(focus)
  const [renaming, setRenaming] = useState(false)
  const panel = isPatchPanel(device)
  const facade = useMemo(() => switchFacade(device.ports, { patchPanel: panel }), [device.ports, panel])
  const portsById = useMemo(() => new Map(device.ports.map((q) => [q.id, q])), [device.ports])
  // Survol d'une prise de panneau : sa jumelle est mise en évidence (jamais dans une vue figée).
  const [hovered, setHovered] = useState<string | null>(null)
  const twin = !readOnly && hovered ? passThroughPeer(device, hovered) : undefined
  const compat = usePortCompatibility(id)
  const updateInternals = useUpdateNodeInternals()
  useEffect(() => {
    updateInternals(id)
  }, [id, facade, updateInternals])
  const summary = device.switch ? switchSummary(device.switch, m) : (template ? displayName(template, lang) : '')
  const labels = facadeLabels(device.name, summary, facade.width, poeUsage?.budgetW !== undefined ? { usedW: poeUsage.usedW, budgetW: poeUsage.budgetW } : undefined)
  const fullTitle = summary ? `${device.name} · ${summary}` : device.name
  const gradientId = `swg-${id}`
  const { width, height } = facade
  return (
    <div className={`sw${panel ? ' sw--panel' : ''}${selected ? ' sw--selected' : ''}${dim ? ' is-dim' : ''}`} style={{ width, height }} data-testid={`device-${device.name}`}>
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
          <rect className="sw__tape" x={TAPE_X} y={6} width={labels.tapeWidth} height={14} rx={1} />
          <text className="sw__tape-text" x={TAPE_X + 6} y={16.5}>
            {labels.tape}
          </text>
        </g>
        {labels.poe && (
          <text className="sw__poe" x={width - 22} y={17} textAnchor="end">
            {labels.poe}
          </text>
        )}
        {facade.ties?.map((t) => {
          const state = ports[t.front] && ports[t.back] ? 'complete' : ports[t.front] || ports[t.back] ? 'partial' : 'empty'
          return <line key={t.position} className={`sw__tie sw__tie--${state}`} x1={t.x} y1={t.y1} x2={t.x} y2={t.y2} />
        })}
        {facade.rowLabelX !== undefined &&
          (['top', 'bottom'] as const).map((row) => {
            const sample = facade.ports.find((q) => q.row === row)
            return (
              sample && (
                <text key={row} className="sw__row" x={facade.rowLabelX} y={sample.y + sample.h / 2 + 2.5}>
                  {row === 'top' ? m.model.patchPanel.frontRow : m.model.patchPanel.backRow}
                </text>
              )
            )
          })}
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
              <circle className={ledClass} cx={p.x + p.w / 2} cy={panel && p.row === 'bottom' ? p.y + p.h + 5 : p.y - 4} r={1.6} />
              {p.number !== undefined && (
                <text className="sw__num" x={p.x + p.w / 2} y={numberY} textAnchor="middle">
                  {p.number}
                </text>
              )}
            </g>
          )
        })}
      </svg>
      {renaming ? (
        <InlineName
          value={device.name}
          label={m.canvas.tile.deviceNameLabel}
          className="inline-name--rack"
          onCommit={(name) => projectStore.getState().updateDevice(id, { name })}
          onDone={() => setRenaming(false)}
        />
      ) : (
        <div
          className="sw__tape-hit"
          style={{ width: labels.tapeWidth }}
          title={readOnly ? fullTitle : m.canvas.tile.renameDevice({ title: fullTitle })}
          onDoubleClick={(e) => {
            if (readOnly) return
            e.stopPropagation()
            setRenaming(true)
          }}
        />
      )}
      {facade.ports.map((p) => {
        const state = compat(p.id)
        const def = portsById.get(p.id)
        return (
          <Handle
            key={p.id}
            id={p.id}
            type="source"
            position={facade.twoRows && p.row === 'top' ? Position.Top : Position.Bottom}
            className={`sw__handle${state ? ` port--${state}` : ''}${twin === p.id ? ' port--twin' : ''}`}
            style={{ left: p.x, top: p.y, width: p.w, height: p.h, transform: 'none' }}
            title={m.canvas.tile.portTitle({ label: def ? portDisplayLabel(device, def, m) : p.label })}
            onMouseEnter={panel && !readOnly ? () => setHovered(p.id) : undefined}
            onMouseLeave={panel && !readOnly ? () => setHovered(null) : undefined}
          />
        )
      })}
    </div>
  )
}

export const SwitchNode = memo(SwitchNodeImpl)
