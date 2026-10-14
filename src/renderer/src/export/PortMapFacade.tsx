import type { Device } from '../model/types'
import type { PortMapRow } from '../reports/portMaps'
import { switchFacade } from '../canvas/switchFacade'
import { BOLT_PATH } from '../canvas/cordGeometry'

// Façade d'un switch pour la carte des ports (spec § 11.1, section 3). Chaque port prend la couleur de
// son VLAN natif ; un trunk a un contour épais ; un éclair marque le PoE actif. Vectoriel, à l'échelle de
// la page, mais jamais agrandi plus de 1,6 fois.
export function PortMapFacade({ device, rows }: { device: Device; rows: PortMapRow[] }) {
  const facade = switchFacade(device.ports)
  const byId = new Map(rows.map((r) => [r.portId, r]))
  return (
    <svg className="pmf" viewBox={`0 0 ${facade.width} ${facade.height}`} style={{ maxWidth: facade.width * 1.6 }} role="img" aria-label={`Façade de ${device.name}`}>
      <rect className="pmf__panel" x={0.5} y={0.5} width={facade.width - 1} height={facade.height - 1} rx={3} />
      {facade.ports.map((p) => {
        const row = byId.get(p.id)
        const top = facade.twoRows && p.row === 'top'
        return (
          <g key={p.id} data-port={p.id}>
            <rect className={`pmf__port${row?.trunk ? ' pmf__port--trunk' : ''}`} x={p.x} y={p.y} width={p.w} height={p.h} rx={1.5} fill={row?.fill ?? '#ffffff'} />
            {row?.poeActive && <path className="pmf__bolt" d={BOLT_PATH} transform={`translate(${p.x + p.w / 2} ${p.y + p.h / 2}) scale(0.75)`} />}
            <text className="pmf__num" x={p.x + p.w / 2} y={top ? p.y - 3 : p.y + p.h + 8} textAnchor="middle">
              {p.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
