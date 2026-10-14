// src/renderer/src/panels/inspector/VlanForm.tsx
import type { Project, Vlan } from '../../model/types'
import type { VlanPatch } from '../../model/vlans'
import { vlanMembers } from '../../model/derive'
import { projectStore } from '../../store/projectStore'
import { uiStore } from '../../store/uiStore'
import { CommitInput } from '../CommitInput'

type Unifi = Vlan['unifi']
const FORWARD: ReadonlyArray<{ value: Unifi['forwardUnknownMulticast']; label: string }> = [
  { value: 'router-ports', label: 'Multicast Router Ports' },
  { value: 'flood', label: 'Flood' },
  { value: 'drop', label: 'Drop' }
]
const MDNS: ReadonlyArray<{ value: Unifi['mdnsProxy']; label: string }> = [
  { value: 'off', label: 'Off' },
  { value: 'auto', label: 'Auto' },
  { value: 'all', label: 'All' },
  { value: 'custom', label: 'Custom' }
]
const PROAV = ['Dante Audio', 'NDI with Dante Audio'] as const

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle">
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

export function VlanForm({ vlan, project }: { vlan: Vlan; project: Project }) {
  const s = projectStore.getState
  const up = (patch: VlanPatch): void => s().updateVlan(vlan.id, patch)
  const unifi = (patch: Partial<Unifi>): void => up({ unifi: { ...vlan.unifi, ...patch } })
  const members = vlanMembers(project, vlan.id)
  const nd = members.deviceIds.length
  const nl = members.linkIds.length
  return (
    <div>
      <h2 className="insp__title">VLAN {vlan.id}</h2>
      <label className="field">
        <span className="field__label">Numéro (1 à 4094)</span>
        <CommitInput
          className="input"
          aria-label="Numéro du VLAN"
          inputMode="numeric"
          value={String(vlan.id)}
          onCommit={(v) => {
            const to = Number(v.trim())
            if (s().changeVlanId(vlan.id, to)) uiStore.getState().setInspectVlan(to)
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">Nom</span>
        <CommitInput className="input" aria-label="Nom du VLAN" value={vlan.name} onCommit={(v) => v.trim() && up({ name: v.trim() })} />
      </label>
      <label className="field">
        <span className="field__label">Nom court</span>
        <CommitInput className="input" aria-label="Nom court" value={vlan.short} onCommit={(v) => v.trim() && up({ short: v.trim().toUpperCase() })} />
      </label>
      <div className="field">
        <span className="field__label">Couleur du cordon</span>
        <div className="colors">
          <label className="colors__item">
            <CommitInput type="color" aria-label="Couleur en thème sombre" value={vlan.color.dark.toLowerCase()} onCommit={(v) => up({ color: { ...vlan.color, dark: v.toUpperCase() } })} />
            Sombre
          </label>
          <label className="colors__item">
            <CommitInput type="color" aria-label="Couleur en thème clair" value={vlan.color.light.toLowerCase()} onCommit={(v) => up({ color: { ...vlan.color, light: v.toUpperCase() } })} />
            Clair
          </label>
        </div>
      </div>
      <label className="field">
        <span className="field__label">Sous-réseau</span>
        <CommitInput className="input" aria-label="Sous-réseau" placeholder="10.40.0.0/24" value={vlan.subnet ?? ''} onCommit={(v) => up({ subnet: v.trim() || undefined })} />
      </label>
      <label className="field">
        <span className="field__label">Passerelle</span>
        <CommitInput className="input" aria-label="Passerelle" placeholder="10.40.0.1" value={vlan.gateway ?? ''} onCommit={(v) => up({ gateway: v.trim() || undefined })} />
      </label>
      <Toggle label="Serveur DHCP" checked={vlan.dhcp?.enabled ?? false} onChange={(enabled) => up({ dhcp: { ...vlan.dhcp, enabled } })} />
      {vlan.dhcp?.enabled && (
        <label className="field">
          <span className="field__label">Plage DHCP</span>
          <CommitInput className="input" aria-label="Plage DHCP" placeholder="10.40.0.100-10.40.0.199" value={vlan.dhcp.range ?? ''} onCommit={(v) => up({ dhcp: { enabled: true, ...(v.trim() ? { range: v.trim() } : {}) } })} />
        </label>
      )}
      <Toggle label="Accès Internet" checked={vlan.internet} onChange={(internet) => up({ internet })} />
      <section className="insp__section">
        <h3 className="insp__title">Réglages UniFi</h3>
        <Toggle label="IGMP Snooping" checked={vlan.unifi.igmpSnooping} onChange={(igmpSnooping) => unifi({ igmpSnooping })} />
        {vlan.unifi.igmpSnooping && (
          <div className="insp__nested">
            <Toggle label="Create New Querier Switch" checked={vlan.unifi.querier} onChange={(querier) => unifi({ querier })} />
            <label className="field">
              <span className="field__label">Forward Unknown Multicast Traffic</span>
              <select
                className="input"
                aria-label="Forward Unknown Multicast Traffic"
                value={vlan.unifi.forwardUnknownMulticast}
                onChange={(e) => unifi({ forwardUnknownMulticast: e.target.value as Unifi['forwardUnknownMulticast'] })}
              >
                {FORWARD.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <Toggle label="Flood Known Protocols" checked={vlan.unifi.floodKnownProtocols} onChange={(floodKnownProtocols) => unifi({ floodKnownProtocols })} />
            <Toggle label="Fast Leave" checked={vlan.unifi.fastLeave} onChange={(fastLeave) => unifi({ fastLeave })} />
          </div>
        )}
        <label className="field">
          <span className="field__label">mDNS Proxy</span>
          <select className="input" aria-label="mDNS Proxy" value={vlan.unifi.mdnsProxy} onChange={(e) => unifi({ mdnsProxy: e.target.value as Unifi['mdnsProxy'] })}>
            {MDNS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Toggle label="Network Isolation" checked={vlan.unifi.networkIsolation} onChange={(networkIsolation) => unifi({ networkIsolation })} />
        <label className="field">
          <span className="field__label">Profil de port ProAV</span>
          <select className="input" aria-label="ProAV" value={vlan.unifi.proAvProfile ?? ''} onChange={(e) => unifi({ proAvProfile: e.target.value || undefined })}>
            <option value="">Aucun</option>
            {PROAV.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <Toggle label="Jumbo Frames" checked={vlan.unifi.jumboFrames} onChange={(jumboFrames) => unifi({ jumboFrames })} />
      </section>
      <label className="field">
        <span className="field__label">Note</span>
        <CommitInput className="input" aria-label="Note du VLAN" value={vlan.note ?? ''} onCommit={(v) => up({ note: v.trim() || undefined })} />
      </label>
      <p className="insp__note">
        {nd} appareil{nd > 1 ? 's' : ''} · {nl} câble{nl > 1 ? 's' : ''}
      </p>
      <button
        type="button"
        className="btn btn--danger"
        onClick={() => {
          if (!window.confirm(`Retirer le VLAN ${vlan.id} du projet ? Les ports qui l’utilisent gardent leur réglage.`)) return
          s().removeVlan(vlan.id)
          uiStore.getState().setInspectVlan(null)
        }}
      >
        Retirer ce VLAN
      </button>
    </div>
  )
}
