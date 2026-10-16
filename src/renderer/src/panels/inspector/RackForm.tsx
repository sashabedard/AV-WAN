import type { Project, Rack } from '../../model/types'
import { RACK_HEIGHTS, RACK_HEIGHT_MAX } from '../../model/racks'
import { parseIntField } from '../../model/fields'
import { rackDevices } from '../../model/racks'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'
import { useT } from '../../i18n/useT'

// Fiche d'une baie sélectionnée par son titre (spec § 4.3).
export function RackForm({ rack, project }: { rack: Rack; project: Project }) {
  const { m } = useT()
  const t = m.inspector.rackForm
  const s = projectStore.getState
  const members = rackDevices(project, rack.id).length
  return (
    <div>
      <h2 className="insp__title">{t.title}</h2>
      <label className="field">
        <span className="field__label">{t.name}</span>
        <CommitInput
          className="input"
          aria-label={t.nameAria}
          value={rack.name}
          onCommit={(v) => {
            if (v.trim()) s().updateRack(rack.id, { name: v.trim() })
          }}
        />
      </label>
      <label className="field">
        <span className="field__label">{t.zone}</span>
        <select className="input" aria-label={t.zoneAria} value={rack.zoneId ?? ''} onChange={(e) => s().updateRack(rack.id, { zoneId: e.target.value === '' ? null : e.target.value })}>
          <option value="">{t.noZone}</option>
          {project.zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </label>
      <div className="field">
        <span className="field__label">{t.height}</span>
        <div className="patch__row">
          {RACK_HEIGHTS.map((h) => (
            <button key={h} type="button" className="btn" aria-pressed={rack.heightU === h} onClick={() => s().updateRack(rack.id, { heightU: h })}>
              {h}U
            </button>
          ))}
        </div>
        <CommitInput
          className="input"
          aria-label={t.heightAria}
          inputMode="numeric"
          value={String(rack.heightU)}
          onCommit={(text) => {
            const n = parseIntField(text, 1, RACK_HEIGHT_MAX)
            if (n === undefined) s().showToast(m.inspector.rack.intToast({ label: t.heightAria, min: 1, max: RACK_HEIGHT_MAX }))
            else if (n !== null) s().updateRack(rack.id, { heightU: n })
          }}
        />
      </div>
      <p className="insp__note">
        {members === 0 ? t.empty : t.members({ n: members })} {t.hint}
      </p>
      <button type="button" className="btn" onClick={() => s().removeRack(rack.id)}>
        {t.delete}
      </button>
    </div>
  )
}
