// src/renderer/src/panels/inspector/VlanForm.tsx
import type { Project, Vlan } from '../../model/types'
import type { VlanPatch } from '../../model/vlans'
import { vlanMembers } from '../../model/derive'
import { projectStore } from '../../store/projectStore'
import { uiStore } from '../../store/uiStore'
import { FORWARD_UNKNOWN_CHOICES, MDNS_CHOICES, PROAV_PROFILES, unifiLabels } from '../../catalog/unifi'
import { CommitInput } from '../CommitInput'
import { useT } from '../../i18n/useT'

type Unifi = Vlan['unifi']

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
  const { m } = useT()
  const t = m.inspector.vlan
  const labels = unifiLabels(m)
  const up = (patch: VlanPatch): void => {
    const changed = (Object.keys(patch) as Array<keyof VlanPatch>).some((k) => JSON.stringify(patch[k]) !== JSON.stringify(vlan[k]))
    if (changed) s().updateVlan(vlan.id, patch)
  }
  const unifi = (patch: Partial<Unifi>): void => up({ unifi: { ...vlan.unifi, ...patch } })
  const members = vlanMembers(project, vlan.id)
  const nd = members.deviceIds.length
  const nl = members.linkIds.length
  return (
    <div>
      <h2 className="insp__title">VLAN {vlan.id}</h2>
      <label className="field">
        <span className="field__label">{t.number}</span>
        <CommitInput
          className="input"
          aria-label={t.numberAria}
          inputMode="numeric"
          value={String(vlan.id)}
          onCommit={(v) => {
            const to = Number(v.trim())
            if (s().changeVlanId(vlan.id, to)) uiStore.getState().setInspectVlan(to)
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">{t.name}</span>
        <CommitInput className="input" aria-label={t.nameAria} value={vlan.name} onCommit={(v) => v.trim() && up({ name: v.trim() })} />
      </label>
      <label className="field">
        <span className="field__label">{t.short}</span>
        <CommitInput className="input" aria-label={t.short} value={vlan.short} onCommit={(v) => v.trim() && up({ short: v.trim().toUpperCase() })} />
      </label>
      <div className="field">
        <span className="field__label">{t.cordColor}</span>
        <div className="colors">
          <label className="colors__item">
            <CommitInput type="color" aria-label={t.darkAria} value={vlan.color.dark.toLowerCase()} onCommit={(v) => up({ color: { ...vlan.color, dark: v.toUpperCase() } })} />
            {t.dark}
          </label>
          <label className="colors__item">
            <CommitInput type="color" aria-label={t.lightAria} value={vlan.color.light.toLowerCase()} onCommit={(v) => up({ color: { ...vlan.color, light: v.toUpperCase() } })} />
            {t.light}
          </label>
        </div>
      </div>
      <label className="field">
        <span className="field__label">{t.subnet}</span>
        <CommitInput className="input" aria-label={t.subnet} placeholder="10.40.0.0/24" value={vlan.subnet ?? ''} onCommit={(v) => up({ subnet: v.trim() || undefined })} />
      </label>
      <label className="field">
        <span className="field__label">{t.gateway}</span>
        <CommitInput className="input" aria-label={t.gateway} placeholder="10.40.0.1" value={vlan.gateway ?? ''} onCommit={(v) => up({ gateway: v.trim() || undefined })} />
      </label>
      <Toggle label={t.dhcpServer} checked={vlan.dhcp?.enabled ?? false} onChange={(enabled) => up({ dhcp: { ...vlan.dhcp, enabled } })} />
      {vlan.dhcp?.enabled && (
        <label className="field">
          <span className="field__label">{t.dhcpRange}</span>
          <CommitInput className="input" aria-label={t.dhcpRange} placeholder="10.40.0.100-10.40.0.199" value={vlan.dhcp.range ?? ''} onCommit={(v) => up({ dhcp: { enabled: true, ...(v.trim() ? { range: v.trim() } : {}) } })} />
        </label>
      )}
      <Toggle label={t.internet} checked={vlan.internet} onChange={(internet) => up({ internet })} />
      <section className="insp__section">
        <h3 className="insp__title">{t.unifiTitle}</h3>
        <Toggle label={labels.igmpSnooping} checked={vlan.unifi.igmpSnooping} onChange={(igmpSnooping) => unifi({ igmpSnooping })} />
        {vlan.unifi.igmpSnooping && (
          <div className="insp__nested">
            <Toggle label={labels.querier} checked={vlan.unifi.querier} onChange={(querier) => unifi({ querier })} />
            <label className="field">
              <span className="field__label">{labels.forwardUnknownMulticast}</span>
              <select
                className="input"
                aria-label="Forward Unknown Multicast Traffic"
                value={vlan.unifi.forwardUnknownMulticast}
                onChange={(e) => unifi({ forwardUnknownMulticast: e.target.value as Unifi['forwardUnknownMulticast'] })}
              >
                {FORWARD_UNKNOWN_CHOICES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <Toggle label={labels.floodKnownProtocols} checked={vlan.unifi.floodKnownProtocols} onChange={(floodKnownProtocols) => unifi({ floodKnownProtocols })} />
            <Toggle label={labels.fastLeave} checked={vlan.unifi.fastLeave} onChange={(fastLeave) => unifi({ fastLeave })} />
          </div>
        )}
        <label className="field">
          <span className="field__label">{labels.mdnsProxy}</span>
          <select className="input" aria-label="mDNS Proxy" value={vlan.unifi.mdnsProxy} onChange={(e) => unifi({ mdnsProxy: e.target.value as Unifi['mdnsProxy'] })}>
            {MDNS_CHOICES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Toggle label={labels.networkIsolation} checked={vlan.unifi.networkIsolation} onChange={(networkIsolation) => unifi({ networkIsolation })} />
        <label className="field">
          <span className="field__label">{labels.proAvProfile}</span>
          <select className="input" aria-label="ProAV" value={vlan.unifi.proAvProfile ?? ''} onChange={(e) => unifi({ proAvProfile: e.target.value || undefined })}>
            <option value="">{t.none}</option>
            {PROAV_PROFILES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <Toggle label={labels.jumboFrames} checked={vlan.unifi.jumboFrames} onChange={(jumboFrames) => unifi({ jumboFrames })} />
      </section>
      <label className="field">
        <span className="field__label">{t.note}</span>
        <CommitInput className="input" aria-label={t.noteAria} value={vlan.note ?? ''} onCommit={(v) => up({ note: v.trim() || undefined })} />
      </label>
      <p className="insp__note">
        {t.counts({ devices: nd, cables: nl })}
      </p>
      <button
        type="button"
        className="btn btn--danger"
        onClick={() => {
          if (!window.confirm(t.confirmRemove({ id: vlan.id }))) return
          s().removeVlan(vlan.id)
          if (!s().history.present.vlans.some((v) => v.id === vlan.id)) uiStore.getState().setInspectVlan(null)
        }}
      >
        {t.remove}
      </button>
    </div>
  )
}
