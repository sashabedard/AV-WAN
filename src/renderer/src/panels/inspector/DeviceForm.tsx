// src/renderer/src/panels/inspector/DeviceForm.tsx
import { useState } from 'react'
import type { Device, PortSide, Project } from '../../model/types'
import { linksOnRemovedPorts, projectStore } from '../../store/projectStore'
import { isRackDevice } from '../../model/rules'
import { switchPoeUsage } from '../../model/derive'
import { getTemplate } from '../../catalog'
import { switchSummary } from '../../catalog/switch'
import { CommitInput } from '../CommitInput'
import { Segmented } from '../Segmented'
import { SwitchConfigurator } from '../SwitchConfigurator'
import { peersOf, portVlanSummary } from './format'
import { isUniverseOutput, UNIVERSE_MAX } from '../../model/dmx'
import { parseDecimalField, parseIntField } from '../../model/fields'
import { PsuSection } from './PsuSection'
import { LedStripSection } from './LedStripSection'
import { PatchSection } from './PatchSection'

function SwitchSection({ device, project }: { device: Device; project: Project }) {
  const [editing, setEditing] = useState(false)
  const spec = device.switch
  if (!spec) return null
  const usage = switchPoeUsage(project, device.id)
  return (
    <section className="insp__section">
      <h3 className="insp__title">Configuration</h3>
      <p className="insp__note">
        {switchSummary(spec)}
        {usage.budgetW !== undefined ? ` · PoE ${usage.usedW} / ${usage.budgetW} W` : ''}
      </p>
      {editing ? (
        <SwitchConfigurator
          initial={spec}
          submitLabel="Appliquer"
          onCancel={() => setEditing(false)}
          onSubmit={(next) => {
            const removed = linksOnRemovedPorts(project, device.id, next)
            if (removed.length > 0 && !window.confirm(`Ces câbles seront retirés : ${removed.map((l) => l.cableId).join(', ')}. Continuer ?`)) return
            projectStore.getState().updateSwitchSpec(device.id, next)
            setEditing(false)
          }}
        />
      ) : (
        <button type="button" className="btn" onClick={() => setEditing(true)}>
          Modifier la configuration
        </button>
      )}
    </section>
  )
}

export function DeviceForm({ device, project }: { device: Device; project: Project }) {
  const s = projectStore.getState
  const template = getTemplate(project, device.templateId)
  const ipMode = device.ip?.mode ?? 'dhcp'
  const universePorts = new Set(device.ports.filter((p) => isUniverseOutput(project, device, p)).map((p) => p.id))
  return (
    <div>
      <h2 className="insp__title">{template?.name ?? 'Appareil'}</h2>
      <label className="field">
        <span className="field__label">Nom</span>
        <CommitInput className="input" aria-label="Nom" value={device.name} onCommit={(v) => s().updateDevice(device.id, { name: v.trim() || device.name })} />
      </label>
      <label className="field">
        <span className="field__label">Modèle / rôle</span>
        <CommitInput
          className="input"
          aria-label="Modèle"
          value={device.model ?? ''}
          placeholder={template?.name}
          onCommit={(v) => s().updateDevice(device.id, { model: v.trim() || undefined })}
        />
      </label>
      {!device.ledStrip && !device.psu && (
        <div className="field">
          <span className="field__label">Puissance</span>
          <div className="patch__row">
            <CommitInput
              className="input"
              aria-label="Puissance (W)"
              inputMode="decimal"
              placeholder="—"
              value={device.powerW !== undefined ? String(device.powerW).replace('.', ',') : ''}
              onCommit={(v) => {
                const n = parseDecimalField(v)
                if (n === undefined) s().showToast('Puissance : un nombre positif ou nul, en watts.')
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
        <span className="field__label">Adresse IP</span>
        <CommitInput
          className="input"
          aria-label="Adresse IP"
          value={device.ip?.address ?? ''}
          placeholder="10.40.0.21"
          onCommit={(v) => s().updateDevice(device.id, { ip: { address: v.trim(), mode: ipMode } })}
        />
        <Segmented
          ariaLabel="Mode d’adressage"
          options={[
            { value: 'static', label: 'Statique' },
            { value: 'dhcp', label: 'DHCP' }
          ]}
          value={ipMode}
          onChange={(mode) => s().updateDevice(device.id, { ip: { address: device.ip?.address ?? '', mode } })}
        />
      </div>
      <label className="field">
        <span className="field__label">Nom d’hôte</span>
        <CommitInput className="input" aria-label="Nom d’hôte" value={device.hostname ?? ''} onCommit={(v) => s().updateDevice(device.id, { hostname: v.trim() || undefined })} />
      </label>
      <label className="field">
        <span className="field__label">Note</span>
        <CommitInput className="input" aria-label="Note" value={device.note ?? ''} onCommit={(v) => s().updateDevice(device.id, { note: v.trim() || undefined })} />
      </label>
      {!isRackDevice(device) && (
        <label className="field">
          <span className="field__label">Côté des prises</span>
          <select className="input" aria-label="Côté des prises" value={device.portSide} onChange={(e) => s().updateDevice(device.id, { portSide: e.target.value as PortSide })}>
            <option value="auto">Automatique (face aux câbles)</option>
            <option value="top">Haut</option>
            <option value="bottom">Bas</option>
            <option value="left">Gauche</option>
            <option value="right">Droite</option>
          </select>
        </label>
      )}
      <p className="insp__note">Zone : {project.zones.find((z) => z.id === device.zoneId)?.name ?? 'aucune'}</p>
      <SwitchSection device={device} project={project} />
      <section className="insp__section">
        <h3 className="insp__title">Ports</h3>
        <table className="ports">
          <thead>
            <tr>
              <th>Port</th>
              <th>Branché à</th>
              <th>VLAN</th>
              <th>PoE</th>
              {universePorts.size > 0 && <th>Univers</th>}
            </tr>
          </thead>
          <tbody>
            {device.ports.map((p) => (
              <tr key={p.id}>
                <td>{p.label}</td>
                <td>{peersOf(project, device, p.id)}</td>
                <td>{portVlanSummary(device.portState[p.id])}</td>
                <td>
                  {p.poeOut ? (
                    <input
                      type="checkbox"
                      aria-label={`PoE port ${p.label}`}
                      checked={device.portState[p.id]?.poeEnabled ?? true}
                      onChange={(e) => s().setPortState(device.id, p.id, { poeEnabled: e.target.checked })}
                    />
                  ) : p.poeIn ? (
                    'reçoit'
                  ) : (
                    ''
                  )}
                </td>
                {universePorts.size > 0 && (
                  <td>
                    {universePorts.has(p.id) && (
                      <CommitInput
                        className="input input--mini"
                        aria-label={`Univers ${p.label}`}
                        inputMode="numeric"
                        value={device.portState[p.id]?.universe !== undefined ? String(device.portState[p.id]!.universe) : ''}
                        onCommit={(v) => {
                          const n = parseIntField(v, 0, UNIVERSE_MAX)
                          if (n === undefined) s().showToast(`Univers : un nombre entier de 0 à ${UNIVERSE_MAX}.`)
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
