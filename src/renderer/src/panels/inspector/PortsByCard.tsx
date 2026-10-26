// src/renderer/src/panels/inspector/PortsByCard.tsx
import { Fragment } from 'react'
import type { Device, PortDef, Project } from '../../model/types'
import { ConnectorSchema } from '../../model/schema'
import { isRackDevice, portDisplayLabel } from '../../model/rules'
import { isNetworkPort } from '../../model/ips'
import { CARD_PRESETS, ONBOARD, cardGroups, type CardPresetId } from '../../model/cards'
import { isUniverseOutput, UNIVERSE_MAX } from '../../model/dmx'
import { parseIntField } from '../../model/fields'
import { connectorLabel } from '../../catalog/labels'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'
import { peersOf, portVlanSummary } from './format'
import { PortIps } from './PortIps'
import { useT } from '../../i18n/useT'

// Section Ports de l'inspecteur (spec cartes-ip-vms § 4.2) : un tableau par carte, « Intégré » d'abord.
// Appareils de baie (switchs, panneaux) : un seul tableau, sans carte ni ajout / suppression de port.
export function PortsByCard({ device, project }: { device: Device; project: Project }) {
  const { m } = useT()
  const t = m.inspector.device
  const s = projectStore.getState
  const editable = !isRackDevice(device)
  const universePorts = new Set(device.ports.filter((p) => isUniverseOutput(project, device, p)).map((p) => p.id))
  const cols = 4 + (universePorts.size > 0 ? 1 : 0) + (editable ? 1 : 0)
  const groups = editable ? cardGroups(device) : [{ cardId: ONBOARD, name: '', ports: device.ports }]

  const row = (p: PortDef) => {
    const label = portDisplayLabel(device, p, m)
    return (
      <Fragment key={p.id}>
        <tr>
          <td>
            {editable ? (
              <CommitInput
                className="input input--mini"
                aria-label={t.portLabelAria({ label })}
                value={p.label}
                onCommit={(v) => s().renamePort(device.id, p.id, v.trim() || p.label)}
              />
            ) : (
              label
            )}
          </td>
          <td>{peersOf(project, device, p.id, m)}</td>
          <td>{portVlanSummary(device.portState[p.id], t)}</td>
          <td>
            {p.poeOut ? (
              <input
                type="checkbox"
                aria-label={t.poePort({ label })}
                checked={device.portState[p.id]?.poeEnabled ?? true}
                onChange={(e) => s().setPortState(device.id, p.id, { poeEnabled: e.target.checked })}
              />
            ) : p.poeIn ? (
              t.receives
            ) : (
              ''
            )}
          </td>
          {universePorts.size > 0 && (
            <td>
              {universePorts.has(p.id) && (
                <CommitInput
                  className="input input--mini"
                  aria-label={t.universeAria({ label })}
                  inputMode="numeric"
                  value={device.portState[p.id]?.universe !== undefined ? String(device.portState[p.id]!.universe) : ''}
                  onCommit={(v) => {
                    const n = parseIntField(v, 0, UNIVERSE_MAX)
                    if (n === undefined) s().showToast(t.universeToast({ max: UNIVERSE_MAX }))
                    else s().setPortState(device.id, p.id, { universe: n ?? undefined })
                  }}
                />
              )}
            </td>
          )}
          {editable && (
            <td>
              <button type="button" className="btn iplist__remove" aria-label={t.removePortAria({ label })} onClick={() => s().removePort(device.id, p.id)}>
                ✕
              </button>
            </td>
          )}
        </tr>
        {isNetworkPort(p) && (
          <tr className="ports__ips">
            <td colSpan={cols}>
              <PortIps device={device} port={p} />
            </td>
          </tr>
        )}
      </Fragment>
    )
  }

  return (
    <section className="insp__section">
      <h3 className="insp__title">{t.ports}</h3>
      {groups.map((g) => {
        const name = g.cardId === ONBOARD ? g.name || m.model.cards.onboard : g.name
        return (
          <div className="card" role="group" aria-label={name} key={g.cardId}>
            {editable && (
              <div className="card__head">
                <CommitInput
                  className="input card__name"
                  aria-label={t.cardNameAria({ name })}
                  value={g.name}
                  placeholder={g.cardId === ONBOARD ? m.model.cards.onboard : undefined}
                  onCommit={(v) => s().renameCard(device.id, g.cardId, v.trim())}
                />
                <select
                  className="input card__add"
                  aria-label={t.addPortAria({ name })}
                  value=""
                  onChange={(e) => e.target.value && s().addPort(device.id, g.cardId, ConnectorSchema.parse(e.target.value))}
                >
                  <option value="">{t.addPortOption}</option>
                  {ConnectorSchema.options.map((c) => (
                    <option key={c} value={c}>
                      {connectorLabel(c, m)}
                    </option>
                  ))}
                </select>
                {g.cardId !== ONBOARD && (
                  <button type="button" className="btn iplist__remove" aria-label={t.removeCardAria({ name })} onClick={() => s().removeCard(device.id, g.cardId)}>
                    ✕
                  </button>
                )}
              </div>
            )}
            {g.ports.length > 0 && (
              <table className="ports">
                <thead>
                  <tr>
                    <th>{t.port}</th>
                    <th>{t.pluggedTo}</th>
                    <th>{t.vlan}</th>
                    <th>{t.poe}</th>
                    {universePorts.size > 0 && <th>{t.universe}</th>}
                    {editable && <th />}
                  </tr>
                </thead>
                <tbody>{g.ports.map(row)}</tbody>
              </table>
            )}
          </div>
        )
      })}
      {editable && (
        <select
          className="input card__new"
          aria-label={t.addCard}
          value=""
          onChange={(e) => e.target.value && s().addCard(device.id, e.target.value as CardPresetId)}
        >
          <option value="">{t.addCardOption}</option>
          {(Object.keys(CARD_PRESETS) as CardPresetId[]).map((id) => (
            <option key={id} value={id}>
              {t.cardPresets[id]}
            </option>
          ))}
        </select>
      )}
    </section>
  )
}
