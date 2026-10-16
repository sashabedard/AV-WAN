// src/renderer/src/panels/inspector/ZoneForm.tsx
import type { Project, Zone } from '../../model/types'
import { ZONE_COLORS } from '../../model/zones'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'
import { useT } from '../../i18n/useT'

export function ZoneForm({ zone, project }: { zone: Zone; project: Project }) {
  const s = projectStore.getState
  const { m } = useT()
  const t = m.inspector.zone
  const members = project.devices.filter((d) => d.zoneId === zone.id).length
  return (
    <div>
      <h2 className="insp__title">{t.title}</h2>
      <label className="field">
        <span className="field__label">{t.name}</span>
        <CommitInput
          className="input"
          aria-label={t.nameAria}
          value={zone.name}
          onCommit={(v) => {
            if (v.trim()) s().updateZone(zone.id, { name: v.trim() })
          }}
        />
      </label>
      <div className="field">
        <span className="field__label">{t.color}</span>
        <div className="swatches" role="radiogroup" aria-label={t.colorAria}>
          {ZONE_COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={zone.color === c}
              aria-label={t.colors[i]}
              className="swatch"
              style={{ background: c }}
              onClick={() => {
                if (zone.color !== c) s().updateZone(zone.id, { color: c })
              }}
            />
          ))}
        </div>
      </div>
      <label className="field--inline">
        <input type="checkbox" checked={zone.ownPdfPage} onChange={(e) => s().updateZone(zone.id, { ownPdfPage: e.target.checked })} /> {t.ownPage}
      </label>
      <p className="insp__note">
        {members === 0 ? t.empty : t.members({ n: members })} {t.hint}
      </p>
    </div>
  )
}
