// src/renderer/src/canvas/VmTile.tsx
import type { Vm } from '../model/types'
import { projectStore, useProjectStore } from '../store/projectStore'
import { formatters } from '../../../shared/i18n/format'
import { useT } from '../i18n/useT'
import { VM_TILE_W, vmTileHeight } from './nodeGeometry'

// Tuile d'une VM dans le nœud de son hôte (spec cartes-ip-vms § 4.5) : pas de prise, elle suit l'hôte.
// « nodrag » : un clic la sélectionne sans déplacer l'hôte.
export function VmTile({ vm }: { vm: Vm }) {
  const { m, lang } = useT()
  const t = m.canvas.tile
  const selected = useProjectStore((s) => s.selection.vmIds?.includes(vm.id) ?? false)
  const fmt = formatters(lang)
  const res = [vm.specs?.vcpu !== undefined ? `${vm.specs.vcpu} vCPU` : '', vm.specs?.ramGb !== undefined ? fmt.qty(vm.specs.ramGb, t.gb) : ''].filter(Boolean).join(' · ')
  return (
    <div
      className={`vm nodrag${selected ? ' vm--selected' : ''}`}
      style={{ width: VM_TILE_W, height: vmTileHeight(vm) }}
      title={t.vmTitle({ name: vm.name })}
      onClick={(e) => {
        e.stopPropagation()
        projectStore.getState().setSelection({ deviceIds: [], linkIds: [], vmIds: [vm.id] })
      }}
    >
      <div className="vm__head">
        <span className="vm__name">{vm.name}</span>
        {vm.specs?.os && <span className="vm__os">{vm.specs.os}</span>}
      </div>
      <div className="vm__res">{res}</div>
      {vm.vnics.map((n) => {
        const ip = n.ips[0]
        const addr = ip ? ip.address || (ip.mode === 'dhcp' ? t.dhcp : '—') : '—'
        return (
          <div className="vm__nic" key={n.id}>
            {`${n.label} · ${addr}`}
          </div>
        )
      })}
    </div>
  )
}
