// src/renderer/src/panels/inspector/PortIps.tsx
import type { Device, PortDef } from '../../model/types'
import { isNetworkPort, portIps } from '../../model/ips'
import { portDisplayLabel } from '../../model/rules'
import { projectStore } from '../../store/projectStore'
import { useT } from '../../i18n/useT'
import { IpList } from './IpList'

// IP d'un port réseau (spec cartes-ip-vms § 4.2) ; rien pour les autres connecteurs.
export function PortIps({ device, port }: { device: Device; port: PortDef }) {
  const { m } = useT()
  if (!isNetworkPort(port)) return null
  const s = projectStore.getState
  return (
    <IpList
      label={portDisplayLabel(device, port, m)}
      ips={portIps(device, port.id)}
      onAdd={() => s().addPortIp(device.id, port.id)}
      onChange={(i, ip) => s().updatePortIp(device.id, port.id, i, ip)}
      onRemove={(i) => s().removePortIp(device.id, port.id, i)}
    />
  )
}
