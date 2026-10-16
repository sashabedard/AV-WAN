import type { Project } from '../model/types'
import { mediumKindLabels, MEDIUM_KIND_ORDER, NEUTRAL, TRUNK, TYPE_COLORS } from '../canvas/cordStyle'
import { useT } from '../i18n/useT'
import { BOLT_PATH } from '../canvas/cordGeometry'

// Styles de trait (spec § 8.4) : indépendants de la couleur, toujours imprimés.
const STROKES: ReadonlyArray<{ id: 'copper' | 'fiber' | 'dac' | 'wifi' | 'simple'; width: number; dash?: string; inner?: boolean }> = [
  { id: 'copper', width: 4.5 },
  { id: 'fiber', width: 3.2, inner: true },
  { id: 'dac', width: 3.2 },
  { id: 'wifi', width: 2, dash: '1.5 5' },
  { id: 'simple', width: 2, dash: '8 5' }
]

function Swatch({ color }: { color: string }) {
  return <span className="pl__swatch" style={{ background: color }} />
}

// Légende du schéma imprimé : la clé de couleur du mode courant (décision 4), puis les styles de trait.
export function PrintLegend({ project }: { project: Project }) {
  const mode = project.settings.colorMode
  const { m } = useT()
  const { legend } = m.pdf
  const kindLabels = mediumKindLabels(m)
  const titles: Record<Project['settings']['colorMode'], string> = { vlan: legend.colorVlan, type: legend.colorType, port: legend.colorPort }
  return (
    <div className="pl" aria-label={legend.label}>
      <div className="pl__col">
        <div className="pl__title">{titles[mode]}</div>
        {mode === 'vlan' && (
          <ul className="pl__list">
            {project.vlans.map((v) => (
              <li key={v.id}>
                <Swatch color={v.color.light} />
                {v.id} · {v.short}
              </li>
            ))}
            <li>
              <Swatch color={TRUNK.light} />
              {legend.trunk}
            </li>
            <li>
              <Swatch color={NEUTRAL.light} />
              {legend.noVlan}
            </li>
          </ul>
        )}
        {mode === 'type' && (
          <ul className="pl__list">
            {MEDIUM_KIND_ORDER.map((k) => (
              <li key={k}>
                <Swatch color={TYPE_COLORS[k].light} />
                {kindLabels[k]}
              </li>
            ))}
          </ul>
        )}
        {mode === 'port' && <p className="pl__note">{legend.portNote}</p>}
      </div>
      <div className="pl__col">
        <div className="pl__title">{legend.strokes}</div>
        <ul className="pl__list">
          {STROKES.map((s) => (
            <li key={s.id}>
              <svg className="pl__stroke" width="34" height="8" aria-hidden="true">
                <line x1="3" y1="4" x2="31" y2="4" style={{ stroke: NEUTRAL.light }} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap="round" />
                {s.inner && <line x1="3" y1="4" x2="31" y2="4" style={{ stroke: '#ffffff' }} strokeWidth={0.9} strokeDasharray="5 3" />}
              </svg>
              {legend[s.id]}
            </li>
          ))}
          <li>
            <svg className="pl__stroke" width="34" height="12" aria-hidden="true">
              <path className="pl__bolt" d={BOLT_PATH} transform="translate(17 6)" />
            </svg>
            {legend.poe}
          </li>
        </ul>
      </div>
    </div>
  )
}
