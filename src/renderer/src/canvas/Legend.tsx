// src/renderer/src/canvas/Legend.tsx
import type { Project } from '../model/types'
import { projectStore, useProject } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { useThemeMode } from '../theme/useThemeMode'
import { Segmented } from '../panels/Segmented'
import { MEDIUM_KIND_LABELS, MEDIUM_KIND_ORDER, NEUTRAL, TRUNK, TYPE_COLORS } from './cordStyle'

type ColorMode = Project['settings']['colorMode']
const COLOR_MODES: ReadonlyArray<{ value: ColorMode; label: string }> = [
  { value: 'vlan', label: 'VLAN' },
  { value: 'type', label: 'Type' },
  { value: 'port', label: 'Port' }
]

export function Legend() {
  const project = useProject()
  const theme = useThemeMode()
  const mode = project.settings.colorMode
  const focus = useUiStore((s) => s.focusVlan)
  return (
    <div className="legend nodrag nopan" aria-label="Légende">
      <span className="legend__title">Couleur</span>
      <Segmented ariaLabel="Mode de couleur" options={COLOR_MODES} value={mode} onChange={(m) => projectStore.getState().setColorMode(m)} />
      {mode === 'vlan' && (
        <ul className="legend__list">
          {project.vlans.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                className="legend__item"
                aria-pressed={focus === v.id}
                title={`Mettre en évidence le VLAN ${v.id}`}
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
              Trunk (bagues = VLAN)
            </span>
          </li>
          <li>
            <span className="legend__item">
              <span className="legend__swatch" style={{ background: NEUTRAL[theme] }} />
              Sans VLAN
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
                {MEDIUM_KIND_LABELS[k]}
              </span>
            </li>
          ))}
        </ul>
      )}
      {mode === 'port' && <p className="legend__note">Câbles neutres, ports et étiquettes toujours affichés.</p>}
    </div>
  )
}
