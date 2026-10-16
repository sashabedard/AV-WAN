// src/renderer/src/canvas/Legend.tsx
import type { Project } from '../model/types'
import { projectStore, useProject } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { useThemeMode } from '../theme/useThemeMode'
import { Segmented } from '../panels/Segmented'
import { useT } from '../i18n/useT'
import { mediumKindLabels, MEDIUM_KIND_ORDER, NEUTRAL, TRUNK, TYPE_COLORS } from './cordStyle'

type ColorMode = Project['settings']['colorMode']

export function Legend() {
  const { m } = useT()
  const project = useProject()
  const kindLabels = mediumKindLabels(m)
  const colorModes: ReadonlyArray<{ value: ColorMode; label: string }> = [
    { value: 'vlan', label: m.canvas.legend.modes.vlan },
    { value: 'type', label: m.canvas.legend.modes.type },
    { value: 'port', label: m.canvas.legend.modes.port }
  ]
  const theme = useThemeMode()
  const mode = project.settings.colorMode
  const focus = useUiStore((s) => s.focusVlan)
  return (
    <div className="legend nodrag nopan" aria-label={m.canvas.legend.label}>
      <span className="legend__title">{m.canvas.legend.title}</span>
      <Segmented ariaLabel={m.canvas.legend.modeLabel} options={colorModes} value={mode} onChange={(m) => projectStore.getState().setColorMode(m)} />
      {mode === 'vlan' && (
        <ul className="legend__list">
          {project.vlans.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className="legend__item"
                aria-pressed={focus === v.id}
                title={m.canvas.legend.highlightVlan({ id: v.id })}
                onClick={() => uiStore.getState().setFocusVlan(focus === v.id ? null : v.id)}
              >
                <span className="legend__swatch" style={{ background: v.color[theme] }} />
                {v.id} · {v.short}
              </button>
            </li>
          ))}
          <li>
            <span className="legend__item">
              <span className="legend__swatch" style={{ background: TRUNK[theme] }} />
              {m.canvas.legend.trunk}
            </span>
          </li>
          <li>
            <span className="legend__item">
              <span className="legend__swatch" style={{ background: NEUTRAL[theme] }} />
              {m.canvas.legend.noVlan}
            </span>
          </li>
        </ul>
      )}
      {mode === 'type' && (
        <ul className="legend__list">
          {MEDIUM_KIND_ORDER.map((k) => (
            <li key={k}>
              <span className="legend__item">
                <span className="legend__swatch" style={{ background: TYPE_COLORS[k][theme] }} />
                {kindLabels[k]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {mode === 'port' && <p className="legend__note">{m.canvas.legend.portNote}</p>}
    </div>
  )
}
