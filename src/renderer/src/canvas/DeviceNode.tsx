import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react'
import type { Side } from '../model/types'
import { POE_LABELS } from '../model/derive'
import { projectStore } from '../store/projectStore'
import { useLocked } from './staticView'
import { DeviceIcon } from '../icons/Icon'
import type { DeviceFlowNode } from './toFlow'
import { useEffectiveFocus } from './useEffectiveFocus'
import { useT } from '../i18n/useT'
import { displayName } from '../catalog/templateText'
import { usePortCompatibility } from './useConnectingFrom'
import { InlineName } from './InlineName'
import { TAPE_TOP_MAX_WIDTH, VM_HEADER_H, baseBox, deviceNodeBox, devicePortOffset, vmBlock } from './nodeGeometry'
import { VmTile } from './VmTile'
import { hardwareLine } from './canvasHelpers'
import { sideLayout } from '../model/sides'

const POSITION: Record<Side, Position> = { top: Position.Top, bottom: Position.Bottom, left: Position.Left, right: Position.Right }

function DeviceNodeImpl({ id, data, selected }: NodeProps<DeviceFlowNode>) {
  const { device, template, sides, ports, vms } = data
  const { m, lang } = useT()
  const readOnly = useLocked()
  const focus = useEffectiveFocus()
  const dim = focus !== null && !data.vlans.includes(focus)
  const [renaming, setRenaming] = useState(false)
  const updateInternals = useUpdateNodeInternals()
  const sidesKey = JSON.stringify(sides)
  useEffect(() => {
    updateInternals(id)
  }, [id, sidesKey, device.ports.length, updateInternals])
  const compat = usePortCompatibility(id)
  const layout = useMemo(() => sideLayout(device, sides), [device, sides])
  const { w: width, h: height } = deviceNodeBox(device, sides, vms)
  const hw = vms.length > 0 ? hardwareLine(device.specs, lang) : ''
  const line1 = device.model ?? (template ? displayName(template, lang) : undefined) ?? m.canvas.tile.device
  const line2 = data.line2
  return (
    <div className={`dn${selected ? ' dn--selected' : ''}${dim ? ' is-dim' : ''}`} style={{ width, height }} data-testid={`device-${device.name}`}>
      {renaming ? (
        <InlineName
          value={device.name}
          label={m.canvas.tile.deviceNameLabel}
          onCommit={(name) => projectStore.getState().updateDevice(id, { name })}
          onDone={() => setRenaming(false)}
        />
      ) : (
        <span
          className="dn__tape"
          style={layout.top.length > 0 ? { maxWidth: TAPE_TOP_MAX_WIDTH } : undefined}
          title={readOnly ? device.name : m.canvas.tile.renameDevice({ title: device.name })}
          onDoubleClick={(e) => {
            if (readOnly) return
            e.stopPropagation()
            setRenaming(true)
          }}
        >
          {device.name}
        </span>
      )}
      {template && <span className="dn__code">{template.code}</span>}
      <span className="dn__icon">
        <DeviceIcon icon={device.icon ?? template?.icon} size={20} />
      </span>
      <span className="dn__line1">{line1}</span>
      <span className="dn__line2">{line2}</span>
      {vms.length > 0 && (
        <div className="dn__vms" style={{ top: baseBox(device, sides).h, width: vmBlock(vms).w }}>
          <div className="dn__hw" style={{ height: VM_HEADER_H }}>
            {device.specs?.os && <span className="vm__os">{device.specs.os}</span>}
            {hw && <span>{hw}</span>}
          </div>
          <div className="dn__vmgrid">
            {vms.map((vm) => (
              <VmTile key={vm.id} vm={vm} />
            ))}
          </div>
        </div>
      )}
      {(Object.keys(layout) as Side[]).flatMap((side) =>
        layout[side].map((p, i, list) => {
          const info = ports[p.id]
          const state = compat(p.id)
          const horizontal = side === 'top' || side === 'bottom'
          const offset = devicePortOffset(side, i, list.length, width, height)
          const style = { ...(horizontal ? { left: offset } : { top: offset }), ...(info ? { '--plug': info.color } : {}) } as CSSProperties
          const kind = p.connector === 'sfp+' ? 'sfpp' : p.connector
          return (
            <Handle
              key={p.id}
              id={p.id}
              type="source"
              position={POSITION[side]}
              className={`port port--${kind}${info ? ' port--linked' : ''}${state ? ` port--${state}` : ''}`}
              style={style}
              title={`${p.label} · ${p.connector.toUpperCase()}${p.poeIn ? ` · ${m.canvas.tile.poweredBy({ label: POE_LABELS[p.poeIn] })}` : ''}`}
            />
          )
        })
      )}
    </div>
  )
}

export const DeviceNode = memo(DeviceNodeImpl)
