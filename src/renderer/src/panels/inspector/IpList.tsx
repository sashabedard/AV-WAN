// src/renderer/src/panels/inspector/IpList.tsx
import type { IpConfig } from '../../model/types'
import { CommitInput } from '../CommitInput'
import { Segmented } from '../Segmented'
import { useT } from '../../i18n/useT'

// Liste d'IP d'une interface (port réseau ou vNIC) : adresse, Statique/DHCP, ✕, puis « + IP ».
export function IpList({
  label,
  ips,
  onAdd,
  onChange,
  onRemove
}: {
  label: string
  ips: readonly IpConfig[]
  onAdd: () => void
  onChange: (index: number, ip: IpConfig) => void
  onRemove: (index: number) => void
}) {
  const t = useT().m.inspector.device
  return (
    <div className="iplist">
      {ips.map((ip, i) => (
        <div className="iplist__row" key={i}>
          <CommitInput
            className="input input--mini"
            aria-label={t.ipAria({ label, n: i + 1 })}
            value={ip.address}
            placeholder="10.40.0.21"
            onCommit={(v) => onChange(i, { ...ip, address: v.trim() })}
          />
          <Segmented
            ariaLabel={t.ipModeAria({ label, n: i + 1 })}
            options={[
              { value: 'static', label: t.ipStatic },
              { value: 'dhcp', label: 'DHCP' }
            ]}
            value={ip.mode}
            onChange={(mode) => onChange(i, { ...ip, mode })}
          />
          <button type="button" className="btn iplist__remove" aria-label={t.removeIpAria({ label, n: i + 1 })} onClick={() => onRemove(i)}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn iplist__add" aria-label={t.addIpAria({ label })} onClick={onAdd}>
        {t.addIp}
      </button>
    </div>
  )
}
