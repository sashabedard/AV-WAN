// src/renderer/src/panels/VlanPanel.tsx
import { useMemo, useState } from 'react'
import { vlanMembers } from '../model/derive'
import { availablePresets, blankVlan } from '../model/vlans'
import { vlanFromPreset } from '../catalog/vlanPresets'
import { projectStore, useProject } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { useThemeMode } from '../theme/useThemeMode'
import { Icon } from '../icons/Icon'
import { useT } from '../i18n/useT'
import { loc } from '../../../shared/i18n/localized'

function inspect(id: number): void {
  projectStore.getState().setSelection({ deviceIds: [], linkIds: [] })
  uiStore.getState().setInspectVlan(id)
}

export function VlanPanel() {
  const project = useProject()
  const { m, lang } = useT()
  const theme = useThemeMode()
  const inspected = useUiStore((s) => s.inspectVlanId)
  const [adding, setAdding] = useState(false)
  const counts = useMemo(() => new Map(project.vlans.map((v) => [v.id, vlanMembers(project, v.id).deviceIds.length])), [project])
  const presets = availablePresets(project)
  return (
    <div className="vlans">
      <ul className="vlans__list" aria-label={m.vlanPanel.listLabel}>
        {project.vlans.map((v) => {
          const n = counts.get(v.id) ?? 0
          return (
            <li key={v.id}>
              <button
                type="button"
                className={`vlans__row${inspected === v.id ? ' is-active' : ''}`}
                aria-label={`${v.id} ${v.name}, ${m.vlanPanel.devices({ n })}`}
                onClick={() => inspect(v.id)}
              >
                <span className="vlans__swatch" style={{ background: v.color[theme] }} />
                <span className="vlans__id">{v.id}</span>
                <span className="vlans__name">{v.name}</span>
                <span className="vlans__count" aria-label={m.vlanPanel.devices({ n })}>
                  {n}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {project.vlans.length === 0 && <p className="vlans__empty">{m.vlanPanel.empty}</p>}
      <button type="button" className="btn vlans__add" aria-label={m.vlanPanel.addLabel} aria-expanded={adding} onClick={() => setAdding((a) => !a)}>
        <Icon name="plus" size={14} /> {m.vlanPanel.add}
      </button>
      {adding && (
        <ul className="vlans__presets" aria-label={m.vlanPanel.presetsLabel}>
          {presets.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="vlans__preset"
                onClick={() => {
                  projectStore.getState().addVlan(vlanFromPreset(p, lang))
                  setAdding(false)
                  if (projectStore.getState().history.present.vlans.some((v) => v.id === p.id)) inspect(p.id)
                }}
              >
                {p.id} · {loc(p.name, lang)}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="vlans__preset"
              onClick={() => {
                const v = blankVlan(projectStore.getState().history.present)
                projectStore.getState().addVlan(v)
                setAdding(false)
                if (projectStore.getState().history.present.vlans.some((x) => x.id === v.id)) inspect(v.id)
              }}
            >
              {m.vlanPanel.blank}
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
