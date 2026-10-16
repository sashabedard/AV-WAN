import { memo, useEffect, type CSSProperties } from 'react'
import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/react'
import type { RackDeviceData } from './toRackFlow'
import { rackDevicePortY } from './toRackFlow'
import { POE_LABELS } from '../model/derive'
import { displayName } from '../catalog/templateText'
import { useEffectiveFocus } from '../canvas/useEffectiveFocus'
import { usePortCompatibility } from '../canvas/useConnectingFrom'
import { useT } from '../i18n/useT'

// Au-delà de ce pas entre deux prises, le nom de la prise est écrit à côté de sa poignée.
const PORT_LABEL_MIN_PITCH = 12

// Appareil sans façade dessinée (Mac sur tablette, nœud DMX…) : bloc pleine largeur, sa hauteur en U,
// une colonne de prises sur le bord droit (une poignée par port, comme les tuiles du schéma).
function RackDeviceNodeImpl({ id, data, selected, width, height }: NodeProps<Node<RackDeviceData, 'rackDevice'>>) {
  const { device, template, ports, heightU } = data
  const { m, lang } = useT()
  const focus = useEffectiveFocus()
  const dim = focus !== null && !data.vlans.includes(focus)
  const compat = usePortCompatibility(id)
  const updateInternals = useUpdateNodeInternals()
  const h = height ?? 0
  useEffect(() => {
    updateInternals(id)
  }, [id, h, device.ports.length, updateInternals])
  const kind = device.model ?? (template ? displayName(template, lang) : undefined) ?? m.canvas.tile.device
  const count = device.ports.length
  const showLabels = h / (count + 1) >= PORT_LABEL_MIN_PITCH
  return (
    <div className={`rdev${selected ? ' rdev--selected' : ''}${dim ? ' is-dim' : ''}`} style={{ width: width ?? 0, height: h }} data-testid={`rack-device-${device.name}`}>
      <span className="rdev__ear rdev__ear--left" />
      <span className="rdev__ear rdev__ear--right" />
      <span className="rdev__tape">{device.name}</span>
      <span className="rdev__kind">{kind}</span>
      <span className="rdev__u">{m.racks.units({ n: heightU })}</span>
      {device.ports.map((p, i) => {
        const info = ports[p.id]
        const state = compat(p.id)
        const top = rackDevicePortY(i, count, h)
        const conn = p.connector === 'sfp+' ? 'sfpp' : p.connector
        return (
          <span key={p.id}>
            {showLabels && (
              <span className="rdev__port-label" style={{ top }}>
                {p.label}
              </span>
            )}
            <Handle
              id={p.id}
              type="source"
              position={Position.Right}
              className={`port port--${conn}${info ? ' port--linked' : ''}${state ? ` port--${state}` : ''}`}
              style={{ top, ...(info ? { '--plug': info.color } : {}) } as CSSProperties}
              title={`${p.label} · ${p.connector.toUpperCase()}${p.poeIn ? ` · ${m.canvas.tile.poweredBy({ label: POE_LABELS[p.poeIn] })}` : ''}`}
            />
          </span>
        )
      })}
    </div>
  )
}

export const RackDeviceNode = memo(RackDeviceNodeImpl)
