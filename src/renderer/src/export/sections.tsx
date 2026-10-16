import { Fragment } from 'react'
import type { Project } from '../model/types'
import type { DataTable } from '../../../shared/tables'
import { deviceSheets } from '../reports/deviceSheets'
import { channelBlocks, channelColumns } from '../reports/channelSheets'
import { patchGroups, patchPdfColumns } from '../reports/patch'
import { powerBudget, powerPdfColumns, psuColumns } from '../reports/powerBudget'
import { messages } from '../../../shared/i18n/messages'
import { useLang, useT } from '../i18n/useT'
import { portMaps } from '../reports/portMaps'
import { vlanSheets } from '../reports/vlanSheets'
import { PortMapFacade } from './PortMapFacade'
import { ReportTable } from './ReportTable'

// Section 2 : un bloc par appareil qui n'est pas un switch, jamais coupé entre deux pages.
export function DeviceSheetsPage({ project }: { project: Project }) {
  const { m } = useT()
  const { pdf } = m
  const sheets = deviceSheets(project, useLang())
  const field = (k: 'ip' | 'hostname' | 'zone', value: string): string => pdf.field({ label: pdf.fields[k], value })
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">{pdf.headings.devices}</h2>
      {sheets.length === 0 && <p className="pg__empty">{pdf.empty.devices}</p>}
      {sheets.map((s) => (
        <article key={s.deviceId} className="ds">
          <header className="ds__head">
            <span className="ds__name">{s.name}</span>
            <span className="ds__kind">{[s.kind, s.model].filter(Boolean).join(' · ')}</span>
          </header>
          <p className="ds__meta">{[s.networked && field('ip', s.ip), s.hostname && field('hostname', s.hostname), s.zone && field('zone', s.zone)].filter(Boolean).join(' · ')}</p>
          {s.extras.map((x) => (
            <p key={x} className="ds__meta">
              {x}
            </p>
          ))}
          {s.lines.length === 0 ? (
            <p className="ds__none">{pdf.empty.noCable}</p>
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
  const { lang, m: msg } = useT()
  const groups = patchGroups(project, lang)
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">{msg.reports.patch.title}</h2>
      {groups.length === 0 && <p className="pg__empty">{msg.pdf.empty.patch}</p>}
      {groups.map((g) => (
        <div key={g.title} className="pt">
          <h3 className="pt__h">{g.title}</h3>
          <ReportTable
            table={{
              id: `patch-${g.universe ?? 'sans'}` /* i18n-ignore : identifiant de tableau */,
              title: g.title,
              columns: patchPdfColumns(messages(lang)),
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
  const { lang, m } = useT()
  const blocks = channelBlocks(project, lang)
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">{m.pdf.headings.channels}</h2>
      {blocks.length === 0 && <p className="pg__empty">{m.pdf.empty.channels}</p>}
      <div className="cs">
        {blocks.map((b) => (
          <article key={b.deviceId} className="cs__block">
            <h3 className="cs__h">{b.title}</h3>
            {b.subtitle && <p className="cs__sub">{b.subtitle}</p>}
            <ReportTable table={{ id: `canaux-${b.deviceId}` /* i18n-ignore : identifiant de tableau */, title: b.title, columns: channelColumns(messages(lang)), rows: b.rows }} />
          </article>
        ))}
      </div>
    </section>
  )
}

// Section 3 : pour chaque switch, une page avec sa façade puis le tableau port par port.
export function PortMapsPage({ project }: { project: Project }) {
  const { lang, m } = useT()
  const { pdf, reports: r } = m
  const maps = portMaps(project, lang)
  const columns = [pdf.portMap.port, pdf.portMap.connectedTo, r.cabling.cable, r.cabling.mode, r.cabling.nativeVlan, r.cabling.taggedVlans, r.cabling.poe].map((label) => ({ label }))
  if (maps.length === 0) {
    return (
      <section className="pg pg--sheet">
        <h2 className="pg__h">{pdf.headings.portMaps}</h2>
        <p className="pg__empty">{pdf.empty.switches}</p>
      </section>
    )
  }
  return (
    <>
      {maps.map((pm) => {
        const device = project.devices.find((d) => d.id === pm.deviceId)
        const table: DataTable = { id: `ports-${pm.deviceId}`, title: pm.name, columns, rows: pm.rows.map((row) => [row.port, row.peer, row.cableId, row.mode, row.native, row.tagged, row.poe]) }
        return (
          <section key={pm.deviceId} className="pg pg--sheet pm">
            <h2 className="pg__h">{pdf.portMap.title({ name: pm.name })}</h2>
            <p className="pm__meta">{[pm.model, pm.summary, pm.poe, pdf.field({ label: pdf.fields.ip, value: pm.ip })].filter(Boolean).join(' · ')}</p>
            {device && <PortMapFacade device={device} rows={pm.rows} />}
            <p className="pm__key">{pdf.portMap.key}</p>
            <ReportTable table={table} />
          </section>
        )
      })}
    </>
  )
}

// Section 5 : une fiche par VLAN.
export function VlanSheetsPage({ project }: { project: Project }) {
  const { lang, m } = useT()
  const sheets = vlanSheets(project, lang)
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">{m.pdf.headings.vlans}</h2>
      {sheets.length === 0 && <p className="pg__empty">{m.pdf.empty.vlans}</p>}
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
          <p className="vs__members">{m.pdf.vlanMembers({ count: v.members.length, list: v.members.join(', ') || '—', cables: v.cables })}</p>
          {v.note && <p className="vs__note">{v.note}</p>}
        </article>
      ))}
    </section>
  )
}

// Section « Bilan de puissance » (spec § 6.1).
export function PowerPage({ project }: { project: Project }) {
  const { lang, m, fmt } = useT()
  const b = powerBudget(project, lang)
  const shown = b.missing.slice(0, 12)
  return (
    <section className="pg pg--sheet">
      <h2 className="pg__h">{m.reports.power.title}</h2>
      {b.psus.length === 0 && b.zones.length === 0 && <p className="pg__empty">{m.pdf.empty.power}</p>}
      {b.psus.length > 0 && (
        <div className="pt">
          <h3 className="pt__h">{m.pdf.headings.psus}</h3>
          <ReportTable
            table={{
              id: 'alimentations', // i18n-ignore : identifiant de tableau
              title: m.pdf.headings.psus,
              columns: psuColumns(m),
              rows: b.psus.map((s) => [s.name, s.volts !== undefined ? `${fmt.num(s.volts)} V` : '', s.capacityW ?? null, s.loadW, s.ratio !== undefined ? m.pdf.power.percent({ n: Math.round(s.ratio * 100) }) : '', s.fed.join(', '), s.remark])
            }}
          />
        </div>
      )}
      {b.zones.map((z) => (
        <div key={z.zoneId ?? 'hors-zone'} className="pt">
          <h3 className="pt__h">{z.zone}</h3>
          <ReportTable
            table={{
              id: `puissance-${z.zoneId ?? 'hors-zone'}` /* i18n-ignore : identifiant de tableau */,
              title: z.zone,
              columns: powerPdfColumns(m),
              rows: [...z.rows.map((r) => [r.device, r.type, r.watts ?? null, r.fedBy, r.mainsW ?? null, r.remark]), [m.reports.power.subtotal, '', null, '', z.subtotalW, '']]
            }}
          />
        </div>
      ))}
      {b.zones.length > 0 && <p className="pw__total">{m.pdf.power.total({ watts: fmt.num(b.totalW), amps: fmt.num(b.amps, 1), voltage: b.voltage })}</p>}
      {b.missing.length > 0 && (
        <p className="pw__missing">
          {m.pdf.power.missing({ n: b.missing.length, list: shown.join(', '), more: Math.max(0, b.missing.length - shown.length) })}
        </p>
      )}
      <p className="pw__note">{m.pdf.power.note}</p>
    </section>
  )
}
