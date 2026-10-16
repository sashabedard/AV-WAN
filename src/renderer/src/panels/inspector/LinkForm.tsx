// src/renderer/src/panels/inspector/LinkForm.tsx
import type { Link, Medium, Project } from '../../model/types'
import { projectStore } from '../../store/projectStore'
import { connectorFamily, findPort, sameRef } from '../../model/rules'
import { POE_LABELS, isNetworkMedium, linkPoe, linkVlanView, vlanEnds, type LinkVlanView } from '../../model/derive'
import { mediumLabel, mediaForFamily } from '../../catalog/labels'
import { CommitInput } from '../CommitInput'
import { useT } from '../../i18n/useT'
import { decimalText, parseDecimalField } from '../../model/fields'

type Trunk = Extract<LinkVlanView, { kind: 'trunk' }>

function VlanOptions({ project, current }: { project: Project; current?: number }) {
  const { m } = useT()
  const known = current === undefined || project.vlans.some((v) => v.id === current)
  return (
    <>
      {!known && <option value={current}>{m.inspector.link.absent({ id: current })}</option>}
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
  const { m } = useT()
  const t = m.inspector.link
  const save = (native: number | undefined, tagged: number[] | 'all'): void =>
    s().setLinkVlan(link.id, { kind: 'trunk', ...(native !== undefined ? { native } : {}), tagged })
  const all = view.tagged === 'all'
  const tagged = view.tagged === 'all' ? project.vlans.map((v) => v.id) : view.tagged
  return (
    <>
      <label className="field">
        <span className="field__label">{t.native}</span>
        <select
          className="input"
          aria-label={t.native}
          value={view.native === undefined ? '' : String(view.native)}
          onChange={(e) => save(e.target.value === '' ? undefined : Number(e.target.value), view.tagged)}
        >
          <option value="">{t.none}</option>
          <VlanOptions project={project} current={view.native} />
        </select>
      </label>
      <label className="field--inline">
        <input type="checkbox" checked={all} onChange={(e) => save(view.native, e.target.checked ? 'all' : project.vlans.map((v) => v.id))} /> {t.allVlans}
      </label>
      {!all && (
        <fieldset className="field">
          <legend className="field__label">{t.tagged}</legend>
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
  const { m, lang } = useT()
  const t = m.inspector.link
  const a = findPort(project, link.a)
  const b = findPort(project, link.b)
  const family = a ? connectorFamily(a.port.connector) : 'ethernet'
  const view = linkVlanView(project, link)
  const ends = vlanEnds(project, link)
  // Le réglage est sur un port de switch en amont : le câble passe par un panneau de brassage.
  const via = ends.find((e) => !sameRef(e, link.a) && !sameRef(e, link.b))
  const viaPort = via ? findPort(project, via) : undefined
  const poe = linkPoe(project, link)
  const setMode = (mode: 'none' | 'access' | 'trunk'): void => {
    if (mode === 'none') s().setLinkVlan(link.id, { kind: 'none' })
    else if (mode === 'access') {
      const vlan = view.kind === 'trunk' && view.native !== undefined ? view.native : project.vlans[0]?.id
      if (vlan === undefined) s().showToast(t.addVlanFirst)
      else s().setLinkVlan(link.id, { kind: 'access', vlan })
    } else s().setLinkVlan(link.id, { kind: 'trunk', ...(view.kind === 'access' ? { native: view.vlan } : {}), tagged: 'all' })
  }
  return (
    <div>
      <h2 className="insp__title">{t.title}</h2>
      <p className="insp__note" data-testid="link-ends">
        {a ? `${a.device.name} · ${a.port.label}` : '?'} ⇄ {b ? `${b.device.name} · ${b.port.label}` : '?'}
      </p>
      <label className="field">
        <span className="field__label">{t.id}</span>
        <CommitInput
          className="input"
          aria-label={t.idAria}
          value={link.cableId}
          onCommit={(v) => {
            if (v.trim()) s().updateLink(link.id, { cableId: v.trim() })
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">{t.medium}</span>
        <select className="input" aria-label={t.medium} value={link.medium} onChange={(e) => s().updateLink(link.id, { medium: e.target.value as Medium })}>
          {mediaForFamily(family).map((med) => (
            <option key={med} value={med}>
              {mediumLabel(med, m)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">{t.length}</span>
        <CommitInput
          className="input"
          aria-label={t.lengthAria}
          inputMode="decimal"
          value={link.lengthM !== undefined ? decimalText(link.lengthM, lang) : ''}
          onCommit={(v) => {
            const n = parseDecimalField(v, true, lang)
            if (n === undefined) s().showToast(t.lengthToast)
            else s().updateLink(link.id, { lengthM: n ?? undefined })
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">{t.jacket}</span>
        <CommitInput className="input" aria-label={t.jacket} value={link.jacketColor ?? ''} onCommit={(v) => s().updateLink(link.id, { jacketColor: v.trim() || undefined })} />
      </label>
      {link.medium === 'wifi' && (
        <>
          <label className="field">
            <span className="field__label">{t.ssid}</span>
            <CommitInput className="input" aria-label="SSID" value={link.wifi?.ssid ?? ''} onCommit={(v) => s().updateLink(link.id, { wifi: { ...link.wifi, ssid: v.trim() || undefined } })} />
          </label>
          <label className="field">
            <span className="field__label">{t.band}</span>
            <select
              className="input"
              aria-label={t.bandAria}
              value={link.wifi?.band ?? ''}
              onChange={(e) => s().updateLink(link.id, { wifi: { ...link.wifi, band: e.target.value === '' ? undefined : (e.target.value as '2.4' | '5' | '6') } })}
            >
              <option value="">—</option>
              <option value="2.4">{t.ghz24}</option>
              <option value="5">5 GHz</option>
              <option value="6">6 GHz</option>
            </select>
          </label>
        </>
      )}
      <section className="insp__section">
        <h3 className="insp__title">{t.vlanTitle}</h3>
        {ends.length === 0 ? (
          <p className="insp__note">
            {isNetworkMedium(link.medium) ? t.noSwitch : t.offNetwork}
          </p>
        ) : (
          <>
            {viaPort && (
              <p className="insp__note" data-testid="link-vlan-via">
                {t.via({ device: viaPort.device.name, port: viaPort.port.label })}
              </p>
            )}
            <label className="field">
              <span className="field__label">{t.mode}</span>
              <select className="input" aria-label={t.modeAria} value={view.kind} onChange={(e) => setMode(e.target.value as 'none' | 'access' | 'trunk')}>
                <option value="none">{t.none}</option>
                <option value="access">{t.access}</option>
                <option value="trunk">{t.trunk}</option>
              </select>
            </label>
            {view.kind === 'access' && (
              <label className="field">
                <span className="field__label">{t.vlan}</span>
                <select
                  className="input"
                  aria-label={t.accessAria}
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
        <h3 className="insp__title">{t.poeTitle}</h3>
        <p className="insp__note" data-testid="link-poe">
          {poe.active && poe.cls ? t.poeActive({ label: POE_LABELS[poe.cls], watts: poe.drawW }) : t.noPoe}
        </p>
      </section>
    </div>
  )
}
