import { memo, useEffect, type CSSProperties } from 'react'
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react'
import type { Side } from '../model/types'
import { POE_LABELS } from '../model/derive'
import type { DeviceFlowNode } from './toFlow'
import { usePortCompatibility } from './useConnectingFrom'
import { DEVICE_NODE_HEIGHT, TAPE_TOP_MAX_WIDTH, deviceNodeWidth, devicePortOffset } from './nodeGeometry'

const POSITION: Record<Side, Position> = { top: Position.Top, bottom: Position.Bottom, left: Position.Left, right: Position.Right }

function DeviceNodeImpl({ id, data, selected }: NodeProps<DeviceFlowNode>) {
  const { device, template, side, ports } = data
  const updateInternals = useUpdateNodeInternals()
  useEffect(() => {
    updateInternals(id)
  }, [id, side, device.ports.length, updateInternals])
  const compat = usePortCompatibility(id)
  const width = deviceNodeWidth(device.ports.length)
  const horizontal = side === 'top' || side === 'bottom'
  const line1 = device.model ?? template?.name ?? 'Appareil'
  const line2 = device.ip?.address ? `${device.ip.address} · ${device.ip.mode === 'static' ? 'FIXE' : 'DHCP'}` : 'IP non définie'
  return (
    <div className={`dn${selected ? ' dn--selected' : ''}`} style={{ width, height: DEVICE_NODE_HEIGHT }} data-testid={`device-${device.name}`}>
      <span className="dn__tape" style={side === 'top' ? { maxWidth: TAPE_TOP_MAX_WIDTH } : undefined} title={device.name}>
        {device.name}
      </span>
      {template && <span className="dn__code">{template.code}</span>}
      <span className="dn__line1">{line1}</span>
      <span className="dn__line2">{line2}</span>
      {device.ports.map((p, i) => {
        const info = ports[p.id]
        const state = compat(p.id)
        const offset = devicePortOffset(side, i, device.ports.length, width)
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
            title={`${p.label} · ${p.connector.toUpperCase()}${p.poeIn ? ` · alimenté ${POE_LABELS[p.poeIn]}` : ''}`}
          />
        )
      })}
    </div>
  )
}

export const DeviceNode = memo(DeviceNodeImpl)
