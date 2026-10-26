// src/renderer/src/panels/inspector/VmForm.tsx
import type { Project, Vm } from '../../model/types'
import { isNetworkPort } from '../../model/ips'
import { canHostVms, vnicVlan } from '../../model/vms'
import { decimalText, parseDecimalField, parseIntField } from '../../model/fields'
import { portDisplayLabel } from '../../model/rules'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'
import { IpList } from './IpList'
import { useT } from '../../i18n/useT'

type Specs = NonNullable<Vm['specs']>

// Fiche d'une VM (spec cartes-ip-vms § 4.6) : hôte, ressources, vNIC pontées sur les ports réseau de l'hôte.
export function VmForm({ vm, project }: { vm: Vm; project: Project }) {
  const { m, lang } = useT()
  const t = m.inspector.vm
  const s = projectStore.getState
  const host = project.devices.find((d) => d.id === vm.hostId)
  const hosts = project.devices.filter((d) => canHostVms(project, d))
  const specs = vm.specs ?? {}
  const saveSpecs = (patch: Partial<Specs>): void => {
    const next: Specs = { ...specs, ...patch }
    for (const k of Object.keys(next) as Array<keyof Specs>) if (next[k] === undefined) delete next[k]
    s().updateVm(vm.id, { specs: Object.keys(next).length > 0 ? next : undefined })
  }
  const text = (label: string, value: string | undefined, commit: (v: string | undefined) => void) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <CommitInput className="input" aria-label={label} value={value ?? ''} onCommit={(v) => commit(v.trim() || undefined)} />
    </label>
  )
  const number = (label: string, value: number | undefined, key: 'ramGb' | 'diskGb' | 'vcpu') => (
    <label className="field">
      <span className="field__label">{label}</span>
      <CommitInput
        className="input"
        aria-label={label}
        inputMode={key === 'vcpu' ? 'numeric' : 'decimal'}
        value={value !== undefined ? decimalText(value, lang) : ''}
        onCommit={(v) => {
          const n = key === 'vcpu' ? parseIntField(v, 1, 4096) : parseDecimalField(v, true, lang)
          if (n === undefined) s().showToast(t.numberToast)
          else saveSpecs({ [key]: n ?? undefined })
        }}
      />
    </label>
  )
  const bridges = host ? host.ports.filter(isNetworkPort) : []
  return (
    <div>
      <h2 className="insp__title">{t.title}</h2>
      {text(t.name, vm.name, (v) => s().updateVm(vm.id, { name: v ?? vm.name }))}
      <label className="field">
        <span className="field__label">{t.host}</span>
        <select className="input" aria-label={t.host} value={vm.hostId} onChange={(e) => s().moveVm(vm.id, e.target.value)}>
          {hosts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      {text(t.os, specs.os, (v) => saveSpecs({ os: v }))}
      {number(t.vcpu, specs.vcpu, 'vcpu')}
      {number(t.ram, specs.ramGb, 'ramGb')}
      {number(t.disk, specs.diskGb, 'diskGb')}
      {text(t.gpu, specs.gpuPassthrough, (v) => saveSpecs({ gpuPassthrough: v }))}
      {text(t.hostname, vm.hostname, (v) => s().updateVm(vm.id, { hostname: v }))}
      {text(t.note, vm.note, (v) => s().updateVm(vm.id, { note: v }))}
      <section className="insp__section">
        <h3 className="insp__title">{t.vnics}</h3>
        {vm.vnics.map((n) => {
          const inherited = vnicVlan(project, vm, { ...n, vlanId: undefined })
          return (
            <div className="card" role="group" aria-label={n.label} key={n.id}>
              <div className="card__head">
                <CommitInput
                  className="input card__name"
                  aria-label={t.vnicLabel({ label: n.label })}
                  value={n.label}
                  onCommit={(v) => s().updateVnic(vm.id, n.id, { label: v.trim() || n.label })}
                />
                <button type="button" className="btn iplist__remove" aria-label={t.removeVnic({ label: n.label })} onClick={() => s().removeVnic(vm.id, n.id)}>
                  ✕
                </button>
              </div>
              <div className="card__head">
                <select
                  className="input"
                  aria-label={t.bridge({ label: n.label })}
                  value={n.bridgePortId ?? ''}
                  onChange={(e) => s().updateVnic(vm.id, n.id, { bridgePortId: e.target.value || undefined })}
                >
                  <option value="">{t.bridgeNone}</option>
                  {host &&
                    bridges.map((p) => (
                      <option key={p.id} value={p.id}>
                        {portDisplayLabel(host, p, m)}
                      </option>
                    ))}
                </select>
                <CommitInput
                  className="input input--mini"
                  aria-label={t.vlan({ label: n.label })}
                  inputMode="numeric"
                  value={n.vlanId !== undefined ? String(n.vlanId) : ''}
                  placeholder={inherited !== undefined ? t.vlanInherited({ vlan: inherited }) : 'VLAN'}
                  onCommit={(v) => {
                    const id = parseIntField(v, 1, 4094)
                    if (id === undefined) s().showToast(t.vlanToast)
                    else s().updateVnic(vm.id, n.id, { vlanId: id ?? undefined })
                  }}
                />
              </div>
              <IpList
                label={n.label}
                ips={n.ips}
                onAdd={() => s().updateVnic(vm.id, n.id, { ips: [...n.ips, { address: '', mode: 'static' }] })}
                onChange={(i, ip) => s().updateVnic(vm.id, n.id, { ips: n.ips.map((x, j) => (j === i ? ip : x)) })}
                onRemove={(i) => s().updateVnic(vm.id, n.id, { ips: n.ips.filter((_, j) => j !== i) })}
              />
            </div>
          )
        })}
        <button type="button" className="btn" onClick={() => s().addVnic(vm.id)}>
          {t.addVnic}
        </button>
      </section>
      <button type="button" className="btn btn--danger" onClick={() => s().removeVms([vm.id])}>
        {t.remove}
      </button>
    </div>
  )
}
