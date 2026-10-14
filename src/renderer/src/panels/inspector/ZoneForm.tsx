// src/renderer/src/panels/inspector/ZoneForm.tsx
import type { Project, Zone } from '../../model/types'
import { ZONE_COLORS } from '../../model/zones'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'

const COLOR_NAMES = ['Bleu', 'Vert', 'Ambre', 'Violet', 'Rose', 'Aqua'] as const

export function ZoneForm({ zone, project }: { zone: Zone; project: Project }) {
  const s = projectStore.getState
  const members = project.devices.filter((d) => d.zoneId === zone.id).length
  return (
    <div>
      <h2 className="insp__title">Zone</h2>
      <label className="field">
        <span className="field__label">Nom</span>
        <CommitInput
          className="input"
          aria-label="Nom de la zone"
          value={zone.name}
          onCommit={(v) => {
            if (v.trim()) s().updateZone(zone.id, { name: v.trim() })
          }}
        />
      </label>
      <div className="field">
        <span className="field__label">Couleur</span>
        <div className="swatches" role="radiogroup" aria-label="Couleur de la zone">
          {ZONE_COLORS.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={zone.color === c}
              aria-label={COLOR_NAMES[i]}
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
        <input type="checkbox" checked={zone.ownPdfPage} onChange={(e) => s().updateZone(zone.id, { ownPdfPage: e.target.checked })} /> Page séparée dans le PDF
      </label>
      <p className="insp__note">
        {members === 0 ? 'Aucun appareil dans cette zone.' : `${members} appareil${members > 1 ? 's' : ''} dans cette zone.`} Glisser la zone par son titre
        déplace ses appareils ; la supprimer les garde.
      </p>
    </div>
  )
}
