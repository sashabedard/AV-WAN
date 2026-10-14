// src/renderer/src/panels/inspector/LinkForm.tsx
import type { Link, Medium, Project } from '../../model/types'
import { projectStore } from '../../store/projectStore'
import { connectorFamily, findPort } from '../../model/rules'
import { POE_LABELS, isNetworkMedium, linkPoe, linkVlanView, vlanEnds, type LinkVlanView } from '../../model/derive'
import { MEDIUM_LABELS, mediaForFamily } from '../../catalog/labels'
import { CommitInput } from '../CommitInput'

type Trunk = Extract<LinkVlanView, { kind: 'trunk' }>

function VlanOptions({ project, current }: { project: Project; current?: number }) {
  const known = current === undefined || project.vlans.some((v) => v.id === current)
  return (
    <>
      {!known && <option value={current}>{current} · (VLAN absent du projet)</option>}
      {project.vlans.map((v) => (
        <option key={v.id} value={v.id}>
          {v.id} · {v.name}
        </option>
      ))}
    </>
  )
}

function TrunkFields({ link, project, view }: { link: Link; project: Project; view: Trunk }) {
  const s = projectStore.getState
  const save = (native: number | undefined, tagged: number[] | 'all'): void =>
    s().setLinkVlan(link.id, { kind: 'trunk', ...(native !== undefined ? { native } : {}), tagged })
  const all = view.tagged === 'all'
  const tagged = view.tagged === 'all' ? project.vlans.map((v) => v.id) : view.tagged
  return (
    <>
      <label className="field">
        <span className="field__label">VLAN natif</span>
        <select
          className="input"
          aria-label="VLAN natif"
          value={view.native === undefined ? '' : String(view.native)}
          onChange={(e) => save(e.target.value === '' ? undefined : Number(e.target.value), view.tagged)}
        >
          <option value="">Aucun</option>
          <VlanOptions project={project} current={view.native} />
        </select>
      </label>
      <label className="field--inline">
        <input type="checkbox" checked={all} onChange={(e) => save(view.native, e.target.checked ? 'all' : project.vlans.map((v) => v.id))} /> Tous les VLAN
        (Allow All)
      </label>
      {!all && (
        <fieldset className="field">
          <legend className="field__label">VLAN étiquetés</legend>
          {project.vlans.map((v) => (
            <label key={v.id} className="field--inline">
              <input
                type="checkbox"
                checked={tagged.includes(v.id)}
                onChange={(e) =>
                  save(view.native, e.target.checked ? [...tagged, v.id].sort((x, y) => x - y) : tagged.filter((t) => t !== v.id))
                }
              />{' '}
              {v.id} · {v.name}
            </label>
          ))}
        </fieldset>
      )}
    </>
  )
}

export function LinkForm({ link, project }: { link: Link; project: Project }) {
  const s = projectStore.getState
  const a = findPort(project, link.a)
  const b = findPort(project, link.b)
  const family = a ? connectorFamily(a.port.connector) : 'ethernet'
  const view = linkVlanView(project, link)
  const ends = vlanEnds(project, link)
  const poe = linkPoe(project, link)
  const setMode = (mode: 'none' | 'access' | 'trunk'): void => {
    if (mode === 'none') s().setLinkVlan(link.id, { kind: 'none' })
    else if (mode === 'access') {
      const vlan = view.kind === 'trunk' && view.native !== undefined ? view.native : project.vlans[0]?.id
      if (vlan === undefined) s().showToast('Ajoutez d’abord un VLAN au projet (onglet VLAN, à gauche).')
      else s().setLinkVlan(link.id, { kind: 'access', vlan })
    } else s().setLinkVlan(link.id, { kind: 'trunk', ...(view.kind === 'access' ? { native: view.vlan } : {}), tagged: 'all' })
  }
  return (
    <div>
      <h2 className="insp__title">Câble</h2>
      <p className="insp__note" data-testid="link-ends">
        {a ? `${a.device.name} · ${a.port.label}` : '?'} ⇄ {b ? `${b.device.name} · ${b.port.label}` : '?'}
      </p>
      <label className="field">
        <span className="field__label">Identifiant</span>
        <CommitInput
          className="input"
          aria-label="Identifiant du câble"
          value={link.cableId}
          onCommit={(v) => {
            if (v.trim()) s().updateLink(link.id, { cableId: v.trim() })
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">Médium</span>
        <select className="input" aria-label="Médium" value={link.medium} onChange={(e) => s().updateLink(link.id, { medium: e.target.value as Medium })}>
          {mediaForFamily(family).map((m) => (
            <option key={m} value={m}>
              {MEDIUM_LABELS[m]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">Longueur (m)</span>
        <CommitInput
          className="input"
          aria-label="Longueur en mètres"
          inputMode="decimal"
          value={link.lengthM !== undefined ? String(link.lengthM) : ''}
          onCommit={(v) => {
            const n = Number(v.replace(',', '.'))
            s().updateLink(link.id, { lengthM: v.trim() === '' || !Number.isFinite(n) || n <= 0 ? undefined : n })
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">Couleur de gaine</span>
        <CommitInput className="input" aria-label="Couleur de gaine" value={link.jacketColor ?? ''} onCommit={(v) => s().updateLink(link.id, { jacketColor: v.trim() || undefined })} />
      </label>
      {link.medium === 'wifi' && (
        <>
          <label className="field">
            <span className="field__label">SSID</span>
            <CommitInput className="input" aria-label="SSID" value={link.wifi?.ssid ?? ''} onCommit={(v) => s().updateLink(link.id, { wifi: { ...link.wifi, ssid: v.trim() || undefined } })} />
          </label>
          <label className="field">
            <span className="field__label">Bande</span>
            <select
              className="input"
              aria-label="Bande Wi-Fi"
              value={link.wifi?.band ?? ''}
              onChange={(e) => s().updateLink(link.id, { wifi: { ...link.wifi, band: e.target.value === '' ? undefined : (e.target.value as '2.4' | '5' | '6') } })}
            >
              <option value="">—</option>
              <option value="2.4">2,4 GHz</option>
              <option value="5">5 GHz</option>
              <option value="6">6 GHz</option>
            </select>
          </label>
        </>
      )}
      <section className="insp__section">
        <h3 className="insp__title">VLAN</h3>
        {ends.length === 0 ? (
          <p className="insp__note">
            {isNetworkMedium(link.medium) ? 'Aucun switch sur ce câble : le VLAN se règle sur un port de switch.' : 'Lien hors réseau : pas de VLAN.'}
          </p>
        ) : (
          <>
            <label className="field">
              <span className="field__label">Mode</span>
              <select className="input" aria-label="Mode VLAN" value={view.kind} onChange={(e) => setMode(e.target.value as 'none' | 'access' | 'trunk')}>
                <option value="none">Aucun</option>
                <option value="access">Accès (un VLAN)</option>
                <option value="trunk">Trunk (plusieurs VLAN)</option>
              </select>
            </label>
            {view.kind === 'access' && (
              <label className="field">
                <span className="field__label">VLAN</span>
                <select
                  className="input"
                  aria-label="VLAN d’accès"
                  value={String(view.vlan)}
                  onChange={(e) => s().setLinkVlan(link.id, { kind: 'access', vlan: Number(e.target.value) })}
                >
                  <VlanOptions project={project} current={view.vlan} />
                </select>
              </label>
            )}
            {view.kind === 'trunk' && <TrunkFields link={link} project={project} view={view} />}
          </>
        )}
      </section>
      <section className="insp__section">
        <h3 className="insp__title">PoE</h3>
        <p className="insp__note" data-testid="link-poe">
          {poe.active && poe.cls ? `${POE_LABELS[poe.cls]} actif${poe.drawW !== undefined ? ` · ${poe.drawW} W` : ''}` : 'Pas de PoE sur ce câble.'}
        </p>
      </section>
    </div>
  )
}
