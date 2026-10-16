// src/renderer/src/panels/inspector/DeviceForm.tsx
import { useState } from 'react'
import type { Device, PortSide, Project } from '../../model/types'
import { linksOnRemovedPorts, projectStore } from '../../store/projectStore'
import { isRackDevice, portDisplayLabel } from '../../model/rules'
import { switchPoeUsage } from '../../model/derive'
import { getTemplate } from '../../catalog'
import { switchSummary } from '../../catalog/switch'
import { displayName } from '../../catalog/templateText'
import { CommitInput } from '../CommitInput'
import { Segmented } from '../Segmented'
import { SwitchConfigurator } from '../SwitchConfigurator'
import { peersOf, portVlanSummary } from './format'
import { isUniverseOutput, UNIVERSE_MAX } from '../../model/dmx'
import { decimalText, parseDecimalField, parseIntField } from '../../model/fields'
import { PsuSection } from './PsuSection'
import { LedStripSection } from './LedStripSection'
import { PatchSection } from './PatchSection'
import { useT } from '../../i18n/useT'

function SwitchSection({ device, project }: { device: Device; project: Project }) {
  const [editing, setEditing] = useState(false)
  const { m } = useT()
  const t = m.inspector.device
  const spec = device.switch
  if (!spec) return null
  const usage = switchPoeUsage(project, device.id)
  return (
    <section className="insp__section">
      <h3 className="insp__title">{t.switchConfig}</h3>
      <p className="insp__note">
        {switchSummary(spec, m)}
        {usage.budgetW !== undefined ? ` · PoE ${usage.usedW} / ${usage.budgetW} W` : ''}
      </p>
      {editing ? (
        <SwitchConfigurator
          initial={spec}
          submitLabel={t.apply}
          onCancel={() => setEditing(false)}
          onSubmit={(next) => {
            const removed = linksOnRemovedPorts(project, device.id, next)
            if (removed.length > 0 && !window.confirm(t.confirmRemoved({ cables: removed.map((l) => l.cableId).join(', ') }))) return
            projectStore.getState().updateSwitchSpec(device.id, next)
            setEditing(false)
          }}
        />
      ) : (
        <button type="button" className="btn" onClick={() => setEditing(true)}>
          {t.editConfig}
        </button>
      )}
    </section>
  )
}

export function DeviceForm({ device, project }: { device: Device; project: Project }) {
  const s = projectStore.getState
  const { m, lang } = useT()
  const t = m.inspector.device
  const template = getTemplate(project, device.templateId)
  const ipMode = device.ip?.mode ?? 'dhcp'
  const universePorts = new Set(device.ports.filter((p) => isUniverseOutput(project, device, p)).map((p) => p.id))
  return (
    <div>
      <h2 className="insp__title">{template ? displayName(template, lang) : t.fallbackTitle}</h2>
      <label className="field">
        <span className="field__label">{t.name}</span>
        <CommitInput className="input" aria-label={t.name} value={device.name} onCommit={(v) => s().updateDevice(device.id, { name: v.trim() || device.name })} />
      </label>
      <label className="field">
        <span className="field__label">{t.model}</span>
        <CommitInput
          className="input"
          aria-label={t.modelAria}
          value={device.model ?? ''}
          placeholder={template ? displayName(template, lang) : undefined}
          onCommit={(v) => s().updateDevice(device.id, { model: v.trim() || undefined })}
        />
      </label>
      {!device.ledStrip && !device.psu && (
        <div className="field">
          <span className="field__label">{t.power}</span>
          <div className="patch__row">
            <CommitInput
              className="input"
              aria-label={t.powerAria}
              inputMode="decimal"
              placeholder="—"
              value={device.powerW !== undefined ? decimalText(device.powerW, lang) : ''}
              onCommit={(v) => {
                const n = parseDecimalField(v, false, lang)
                if (n === undefined) s().showToast(t.powerToast)
                else s().updateDevice(device.id, { powerW: n ?? undefined })
              }}
            />
            <span className="patch__range">W</span>
          </div>
        </div>
      )}
      <PsuSection device={device} project={project} />
      <LedStripSection device={device} project={project} />
      <PatchSection device={device} project={project} />
      <div className="field">
        <span className="field__label">{t.ipAddress}</span>
        <CommitInput
          className="input"
          aria-label={t.ipAddress}
          value={device.ip?.address ?? ''}
          placeholder="10.40.0.21"
          onCommit={(v) => s().updateDevice(device.id, { ip: { address: v.trim(), mode: ipMode } })}
        />
        <Segmented
          ariaLabel={t.ipMode}
          options={[
            { value: 'static', label: t.ipStatic },
            { value: 'dhcp', label: 'DHCP' }
          ]}
          value={ipMode}
          onChange={(mode) => s().updateDevice(device.id, { ip: { address: device.ip?.address ?? '', mode } })}
        />
      </div>
      <label className="field">
        <span className="field__label">{t.hostname}</span>
        <CommitInput className="input" aria-label={t.hostname} value={device.hostname ?? ''} onCommit={(v) => s().updateDevice(device.id, { hostname: v.trim() || undefined })} />
      </label>
      <label className="field">
        <span className="field__label">{t.note}</span>
        <CommitInput className="input" aria-label={t.note} value={device.note ?? ''} onCommit={(v) => s().updateDevice(device.id, { note: v.trim() || undefined })} />
      </label>
      {!isRackDevice(device) && (
        <label className="field">
          <span className="field__label">{t.portSide}</span>
          <select className="input" aria-label={t.portSide} value={device.portSide} onChange={(e) => s().updateDevice(device.id, { portSide: e.target.value as PortSide })}>
            <option value="auto">{t.sideAuto}</option>
            <option value="top">{t.sideTop}</option>
            <option value="bottom">{t.sideBottom}</option>
            <option value="left">{t.sideLeft}</option>
            <option value="right">{t.sideRight}</option>
          </select>
        </label>
      )}
      <p className="insp__note">{t.zoneLine({ name: project.zones.find((z) => z.id === device.zoneId)?.name })}</p>
      <SwitchSection device={device} project={project} />
      <section className="insp__section">
        <h3 className="insp__title">{t.ports}</h3>
        <table className="ports">
          <thead>
            <tr>
              <th>{t.port}</th>
              <th>{t.pluggedTo}</th>
              <th>{t.vlan}</th>
              <th>{t.poe}</th>
              {universePorts.size > 0 && <th>{t.universe}</th>}
            </tr>
          </thead>
          <tbody>
            {device.ports.map((p) => (
              <tr key={p.id}>
                <td>{portDisplayLabel(device, p, m)}</td>
                <td>{peersOf(project, device, p.id, m)}</td>
                <td>{portVlanSummary(device.portState[p.id], t)}</td>
                <td>
                  {p.poeOut ? (
                    <input
                      type="checkbox"
                      aria-label={t.poePort({ label: portDisplayLabel(device, p, m) })}
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
                        aria-label={t.universeAria({ label: portDisplayLabel(device, p, m) })}
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
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
