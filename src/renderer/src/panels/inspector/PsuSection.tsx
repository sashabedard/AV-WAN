// src/renderer/src/panels/inspector/PsuSection.tsx
import type { Device, Project, Psu } from '../../model/types'
import { devicePowerW, loadLevel, psuLoad, resolvePsu } from '../../model/power'
import { formatFr, parseDecimalField } from '../../model/fields'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'

type Key = 'volts' | 'amps' | 'watts'
const FIELDS: ReadonlyArray<{ key: Key; label: string; unit: string }> = [
  { key: 'volts', label: 'Tension', unit: 'V' },
  { key: 'amps', label: 'Courant', unit: 'A' },
  { key: 'watts', label: 'Puissance', unit: 'W' }
]
const LEVEL_TEXT = { ok: null, margin: 'Marge de 20 % dépassée', over: 'Surcharge' } as const

function compactPsu(p: Psu): Psu {
  return { ...(p.volts !== undefined ? { volts: p.volts } : {}), ...(p.amps !== undefined ? { amps: p.amps } : {}), ...(p.watts !== undefined ? { watts: p.watts } : {}) }
}
const watts = (d: Device): string => {
  const w = devicePowerW(d)
  return w === undefined ? '—' : `${formatFr(w)} W`
}

// Alimentation (spec § 5.2) : deux valeurs suffisent, la troisième s'affiche en gris ; charge comme un budget PoE.
export function PsuSection({ device, project }: { device: Device; project: Project }) {
  const psu = device.psu
  if (!psu) return null
  const s = projectStore.getState
  const r = resolvePsu(psu)
  const load = psuLoad(project, device.id)
  const level = load.ratio !== undefined ? loadLevel(load.ratio) : 'ok'
  return (
    <section className="insp__section">
      <h3 className="insp__title">Alimentation</h3>
      {FIELDS.map(({ key, label, unit }) => (
        <div key={key} className="field">
          <span className="field__label">{label}</span>
          <div className="patch__row">
            <CommitInput
              className="input"
              aria-label={`${label} (${unit})`}
              inputMode="decimal"
              value={psu[key] !== undefined ? String(psu[key]).replace('.', ',') : ''}
              placeholder={r.computed === key && r[key] !== undefined ? formatFr(r[key]!) : '—'}
              onCommit={(v) => {
                const n = parseDecimalField(v, true)
                if (n === undefined) s().showToast(`${label} : un nombre plus grand que 0.`)
                else s().updateDevice(device.id, { psu: compactPsu({ ...psu, [key]: n ?? undefined }) })
              }}
            />
            <span className="patch__range">{unit}</span>
          </div>
        </div>
      ))}
      {r.product !== undefined && <p className="insp__warn">{`V × I = ${formatFr(r.product)} W`}</p>}
      <p className="insp__note">
        {load.capacityW !== undefined
          ? `Charge : ${formatFr(load.loadW)} W / ${formatFr(load.capacityW)} W (${Math.round((load.ratio ?? 0) * 100)} %)`
          : `Charge : ${formatFr(load.loadW)} W · capacité inconnue`}
      </p>
      {load.ratio !== undefined && (
        <div className={`psu__bar psu__bar--${level}`} aria-hidden="true">
          <span style={{ width: `${Math.min(100, load.ratio * 100)}%` }} />
        </div>
      )}
      {LEVEL_TEXT[level] && <p className="insp__warn">{LEVEL_TEXT[level]}</p>}
      <p className="insp__note">{load.fed.length > 0 ? `Alimente : ${load.fed.map((d) => `${d.name} (${watts(d)})`).join(', ')}` : 'Rien n’est branché sur les sorties DC.'}</p>
    </section>
  )
}
