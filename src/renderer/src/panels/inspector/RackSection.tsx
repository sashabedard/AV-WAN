import type { Device, Project } from '../../model/types'
import { RACK_HEIGHT_MAX } from '../../model/racks'
import { parseIntField } from '../../model/fields'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'
import { useT } from '../../i18n/useT'

// Bloc « Baie » d'un appareil (spec § 4.3) : visible dès que le projet a une baie.
export function RackSection({ device, project }: { device: Device; project: Project }) {
  const { m } = useT()
  const t = m.inspector.rack
  const racks = project.racks ?? []
  if (racks.length === 0) return null
  const s = projectStore.getState
  const at = device.rack
  const rack = at ? racks.find((r) => r.id === at.rackId) : undefined
  const commitInt = (label: string, min: number, max: number, apply: (n: number) => void) => (text: string): void => {
    const n = parseIntField(text, min, max)
    if (n === undefined) s().showToast(t.intToast({ label, min, max }))
    else if (n !== null) apply(n)
  }
  return (
    <section className="insp__section">
      <h3 className="insp__title">{t.title}</h3>
      <label className="field">
        <span className="field__label">{t.rack}</span>
        <select
          className="input"
          aria-label={t.rackAria}
          value={rack?.id ?? ''}
          onChange={(e) => (e.target.value === '' ? s().unplaceFromRack(device.id) : s().placeInRackFirstFree(device.id, e.target.value))}
        >
          <option value="">{t.none}</option>
          {racks.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      {at && rack && (
        <>
          <div className="field">
            <span className="field__label">{t.bottomU}</span>
            <CommitInput className="input" aria-label={t.bottomUAria} inputMode="numeric" value={String(at.u)} onCommit={commitInt(t.bottomUAria, 1, rack.heightU, (n) => s().placeInRack(device.id, rack.id, n))} />
          </div>
          <div className="field">
            <span className="field__label">{t.heightU}</span>
            <CommitInput className="input" aria-label={t.heightUAria} inputMode="numeric" value={String(at.heightU)} onCommit={commitInt(t.heightUAria, 1, RACK_HEIGHT_MAX, (n) => s().setDeviceRackHeight(device.id, n))} />
          </div>
          <button type="button" className="btn" onClick={() => s().unplaceFromRack(device.id)}>
            {t.remove}
          </button>
        </>
      )}
    </section>
  )
}
