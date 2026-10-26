// src/renderer/src/panels/inspector/DeviceForm.tsx
import { useState } from 'react'
import type { Device, PortSide, Project, SideGroup } from '../../model/types'
import { SIDE_GROUPS, sideGroupOf } from '../../model/sides'
import { linksOnRemovedPorts, projectStore } from '../../store/projectStore'
import { isRackDevice } from '../../model/rules'
import { switchPoeUsage } from '../../model/derive'
import { getTemplate } from '../../catalog'
import { switchSummary } from '../../catalog/switch'
import { displayName } from '../../catalog/templateText'
import { CommitInput } from '../CommitInput'
import { SwitchConfigurator } from '../SwitchConfigurator'
import { decimalText, parseDecimalField } from '../../model/fields'
import { PsuSection } from './PsuSection'
import { LedStripSection } from './LedStripSection'
import { PatchSection } from './PatchSection'
import { RackSection } from './RackSection'
import { PortsByCard } from './PortsByCard'
import { HardwareSection } from './HardwareSection'
import { canHostVms } from '../../model/vms'
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

// Réglage d'un type ; '' le retire. Sans aucun réglage, portSides disparaît (rendu d'avant, à l'identique).
function withGroupSide(device: Device, group: SideGroup, side: PortSide | ''): Device['portSides'] {
  const { [group]: _old, ...rest } = device.portSides ?? {}
  const next = side ? { ...rest, [group]: side } : rest
  return Object.keys(next).length > 0 ? next : undefined
}

export function DeviceForm({ device, project }: { device: Device; project: Project }) {
  const s = projectStore.getState
  const { m, lang } = useT()
  const t = m.inspector.device
  const template = getTemplate(project, device.templateId)
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
      {!isRackDevice(device) &&
        SIDE_GROUPS.filter((g) => device.ports.some((p) => sideGroupOf(p.connector) === g)).map((g) => (
          <label className="field" key={g}>
            <span className="field__label">{t.sideGroups[g]}</span>
            <select
              className="input"
              aria-label={t.groupSide({ group: t.sideGroups[g] })}
              value={device.portSides?.[g] ?? ''}
              onChange={(e) => s().updateDevice(device.id, { portSides: withGroupSide(device, g, e.target.value as PortSide | '') })}
            >
              <option value="">{t.sideDefault}</option>
              <option value="auto">{t.sideAuto}</option>
              <option value="top">{t.sideTop}</option>
              <option value="bottom">{t.sideBottom}</option>
              <option value="left">{t.sideLeft}</option>
              <option value="right">{t.sideRight}</option>
            </select>
          </label>
        ))}
      <p className="insp__note">{t.zoneLine({ name: project.zones.find((z) => z.id === device.zoneId)?.name })}</p>
      <HardwareSection device={device} project={project} />
      {canHostVms(project, device) && (
        <button type="button" className="btn" onClick={() => s().addVm(device.id)}>
          {m.inspector.hardware.addVm}
        </button>
      )}
      <RackSection device={device} project={project} />
      <SwitchSection device={device} project={project} />
      <PortsByCard device={device} project={project} />
    </div>
  )
}
