import { Fragment } from 'react'
import type { Project } from '../model/types'
import type { DataTable } from '../../../shared/tables'
import { deviceSheets } from '../reports/deviceSheets'
import { CHANNEL_COLUMNS, channelBlocks } from '../reports/channelSheets'
import { PATCH_PDF_COLUMNS, patchGroups } from '../reports/patch'
import { POWER_PDF_COLUMNS, PSU_COLUMNS, powerBudget } from '../reports/powerBudget'
import { formatFr } from '../model/fields'
import { portMaps } from '../reports/portMaps'
import { vlanSheets } from '../reports/vlanSheets'
import { PortMapFacade } from './PortMapFacade'
import { ReportTable } from './ReportTable'

// Section 2 : un bloc par appareil qui n'est pas un switch, jamais coupé entre deux pages.
export function DeviceSheetsPage({ project }: { project: Project }) {
  const sheets = deviceSheets(project)
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">Fiches par appareil</h2>
      {sheets.length === 0 && <p className="pg__empty">Aucun appareil hors switch dans le projet.</p>}
      {sheets.map((s) => (
        <article key={s.deviceId} className="ds">
          <header className="ds__head">
            <span className="ds__name">{s.name}</span>
            <span className="ds__kind">{[s.kind, s.model].filter(Boolean).join(' · ')}</span>
          </header>
          <p className="ds__meta">{[s.networked && `IP : ${s.ip}`, s.hostname && `Nom d’hôte : ${s.hostname}`, s.zone && `Zone : ${s.zone}`].filter(Boolean).join(' · ')}</p>
          {s.extras.map((x) => (
            <p key={x} className="ds__meta">
              {x}
            </p>
          ))}
          {s.lines.length === 0 ? (
            <p className="ds__none">Aucun câble branché.</p>
          ) : (
            <ul className="ds__lines">
              {s.lines.map((l) => (
                <li key={`${l.connection.linkId}-${l.port}`}>{l.text}</li>
              ))}
            </ul>
          )}
          {s.note && <p className="ds__note">{s.note}</p>}
        </article>
      ))}
    </section>
  )
}

// Section « Patch DMX » : un tableau par univers, trié par adresse (spec patch-puissance-catalogue § 6.1).
export function PatchPage({ project }: { project: Project }) {
  const groups = patchGroups(project)
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">Patch DMX</h2>
      {groups.length === 0 && <p className="pg__empty">Aucun appareil patchable dans le projet.</p>}
      {groups.map((g) => (
        <div key={g.title} className="pt">
          <h3 className="pt__h">{g.title}</h3>
          <ReportTable
            table={{
              id: `patch-${g.universe ?? 'sans'}`,
              title: g.title,
              columns: PATCH_PDF_COLUMNS,
              rows: g.rows.map((r) => [r.address ?? null, r.end ?? null, r.channels, r.device, r.model, r.mode, r.zone, r.remark])
            }}
          />
        </div>
      ))}
    </section>
  )
}

// Section « Canaux DMX » : un bloc par appareil, adresses réelles, sur trois colonnes (spec canaux-dmx § 5).
export function ChannelsPage({ project }: { project: Project }) {
  const blocks = channelBlocks(project)
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">Canaux DMX</h2>
      {blocks.length === 0 && <p className="pg__empty">Aucun canal nommé. Les canaux se nomment dans l’inspecteur, section Patch DMX.</p>}
      <div className="cs">
        {blocks.map((b) => (
          <article key={b.deviceId} className="cs__block">
            <h3 className="cs__h">{b.title}</h3>
            {b.subtitle && <p className="cs__sub">{b.subtitle}</p>}
            <ReportTable table={{ id: `canaux-${b.deviceId}`, title: b.title, columns: CHANNEL_COLUMNS, rows: b.rows }} />
          </article>
        ))}
      </div>
    </section>
  )
}

const PORT_COLUMNS = ['Port', 'Branché à', 'Câble', 'Mode', 'VLAN natif', 'VLAN étiquetés', 'PoE'].map((label) => ({ label }))

// Section 3 : pour chaque switch, une page avec sa façade puis le tableau port par port.
export function PortMapsPage({ project }: { project: Project }) {
  const maps = portMaps(project)
  if (maps.length === 0) {
    return (
      <section className="pg pg--sheet">
        <h2 className="pg__h">Carte des ports</h2>
        <p className="pg__empty">Aucun switch dans le projet.</p>
      </section>
    )
  }
  return (
    <>
      {maps.map((m) => {
        const device = project.devices.find((d) => d.id === m.deviceId)
        const table: DataTable = { id: `ports-${m.deviceId}`, title: m.name, columns: PORT_COLUMNS, rows: m.rows.map((r) => [r.port, r.peer, r.cableId, r.mode, r.native, r.tagged, r.poe]) }
        return (
          <section key={m.deviceId} className="pg pg--sheet pm">
            <h2 className="pg__h">Carte des ports · {m.name}</h2>
            <p className="pm__meta">{[m.model, m.summary, m.poe, `IP : ${m.ip}`].filter(Boolean).join(' · ')}</p>
            {device && <PortMapFacade device={device} rows={m.rows} />}
            <p className="pm__key">Couleur = VLAN natif · contour épais = trunk · éclair = PoE actif</p>
            <ReportTable table={table} />
          </section>
        )
      })}
    </>
  )
}

// Section 5 : une fiche par VLAN.
export function VlanSheetsPage({ project }: { project: Project }) {
  const sheets = vlanSheets(project)
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">Fiches VLAN</h2>
      {sheets.length === 0 && <p className="pg__empty">Aucun VLAN dans le projet.</p>}
      {sheets.map((v) => (
        <article key={v.id} className="vs">
          <header className="vs__head">
            <span className="vs__swatch" style={{ background: v.color }} />
            <span className="vs__name">{`VLAN ${v.id} · ${v.name}`}</span>
            <span className="vs__short">{v.short}</span>
          </header>
          <div className="vs__cols">
            <dl className="vs__dl">
              {v.network.map(([k, val]) => (
                <Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{val}</dd>
                </Fragment>
              ))}
            </dl>
            <dl className="vs__dl">
              {v.unifi.map(([k, val]) => (
                <Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{val}</dd>
                </Fragment>
              ))}
            </dl>
          </div>
          <p className="vs__members">{`Membres (${v.members.length}) : ${v.members.join(', ') || '—'} · ${v.cables} câble${v.cables > 1 ? 's' : ''}`}</p>
          {v.note && <p className="vs__note">{v.note}</p>}
        </article>
      ))}
    </section>
  )
}

// Section « Bilan de puissance » (spec § 6.1).
export function PowerPage({ project }: { project: Project }) {
  const b = powerBudget(project)
  const shown = b.missing.slice(0, 12)
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">Bilan de puissance</h2>
      {b.psus.length === 0 && b.zones.length === 0 && <p className="pg__empty">Aucune puissance renseignée dans le projet.</p>}
      {b.psus.length > 0 && (
        <div className="pt">
          <h3 className="pt__h">Alimentations</h3>
          <ReportTable
            table={{
              id: 'alimentations',
              title: 'Alimentations',
              columns: PSU_COLUMNS,
              rows: b.psus.map((s) => [s.name, s.volts !== undefined ? `${formatFr(s.volts)} V` : '', s.capacityW ?? null, s.loadW, s.ratio !== undefined ? `${Math.round(s.ratio * 100)} %` : '', s.fed.join(', '), s.remark])
            }}
          />
        </div>
      )}
      {b.zones.map((z) => (
        <div key={z.zoneId ?? 'hors-zone'} className="pt">
          <h3 className="pt__h">{z.zone}</h3>
          <ReportTable
            table={{
              id: `puissance-${z.zoneId ?? 'hors-zone'}`,
              title: z.zone,
              columns: POWER_PDF_COLUMNS,
              rows: [...z.rows.map((r) => [r.device, r.type, r.watts ?? null, r.fedBy, r.mainsW ?? null, r.remark]), ['Sous-total', '', null, '', z.subtotalW, '']]
            }}
          />
        </div>
      ))}
      {b.zones.length > 0 && <p className="pw__total">{`Total : ${formatFr(b.totalW)} W · ${formatFr(b.amps, 1)} A à ${b.voltage} V`}</p>}
      {b.missing.length > 0 && (
        <p className="pw__missing">
          {`${b.missing.length} appareil${b.missing.length > 1 ? 's' : ''} sans puissance renseignée : ${shown.join(', ')}${b.missing.length > shown.length ? ` et ${b.missing.length - shown.length} autres` : ''}`}
        </p>
      )}
      <p className="pw__note">Facteur de puissance supposé égal à 1. Alimentations comptées à leur puissance nominale ; appareils PoE comptés dans leur switch.</p>
    </section>
  )
}
