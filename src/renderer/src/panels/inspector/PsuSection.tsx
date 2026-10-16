// src/renderer/src/panels/inspector/PsuSection.tsx
import type { Device, Project, Psu } from '../../model/types'
import { devicePowerW, loadLevel, psuLoad, resolvePsu } from '../../model/power'
import { decimalText, parseDecimalField } from '../../model/fields'
import { useT } from '../../i18n/useT'
import type { Formatters } from '../../../../shared/i18n/format'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'

type Key = 'volts' | 'amps' | 'watts'
const FIELDS: ReadonlyArray<{ key: Key; unit: string }> = [
  { key: 'volts', unit: 'V' },
  { key: 'amps', unit: 'A' },
  { key: 'watts', unit: 'W' }
]

function compactPsu(p: Psu): Psu {
  return { ...(p.volts !== undefined ? { volts: p.volts } : {}), ...(p.amps !== undefined ? { amps: p.amps } : {}), ...(p.watts !== undefined ? { watts: p.watts } : {}) }
}
const watts = (d: Device, fmt: Formatters): string => {
  const w = devicePowerW(d)
  return w === undefined ? '—' : fmt.qty(w, 'W')
}

// Alimentation (spec § 5.2) : deux valeurs suffisent, la troisième s'affiche en gris ; charge comme un budget PoE.
export function PsuSection({ device, project }: { device: Device; project: Project }) {
  const { m, fmt, lang } = useT()
  const t = m.inspector.psu
  const psu = device.psu
  if (!psu) return null
  const labels = { volts: t.voltage, amps: t.current, watts: t.power }
  const levelText = { ok: null, margin: t.margin, over: t.over } as const
  const s = projectStore.getState
  const r = resolvePsu(psu)
  const load = psuLoad(project, device.id)
  const level = load.ratio !== undefined ? loadLevel(load.ratio) : 'ok'
  return (
    <section className="insp__section">
      <h3 className="insp__title">{t.title}</h3>
      {FIELDS.map(({ key, unit }) => {
        const label = labels[key]
        return (
        <div key={key} className="field">
          <span className="field__label">{label}</span>
          <div className="patch__row">
            <CommitInput
              className="input"
              aria-label={`${label} (${unit})`}
              inputMode="decimal"
              value={psu[key] !== undefined ? decimalText(psu[key]!, lang) : ''}
              placeholder={r.computed === key && r[key] !== undefined ? fmt.num(r[key]!) : '—'}
              onCommit={(v) => {
                const n = parseDecimalField(v, true, lang)
                if (n === undefined) s().showToast(t.toast({ label }))
                else s().updateDevice(device.id, { psu: compactPsu({ ...psu, [key]: n ?? undefined }) })
              }}
            />
            <span className="patch__range">{unit}</span>
          </div>
        </div>
        )
      })}
      {r.product !== undefined && <p className="insp__warn">{`V × I = ${fmt.qty(r.product, 'W')}`}</p>}
      <p className="insp__note">
        {load.capacityW !== undefined
          ? t.load({ load: fmt.qty(load.loadW, 'W'), capacity: fmt.qty(load.capacityW, 'W'), pct: Math.round((load.ratio ?? 0) * 100) })
          : t.loadUnknown({ load: fmt.qty(load.loadW, 'W') })}
      </p>
      {load.ratio !== undefined && (
        <div className={`psu__bar psu__bar--${level}`} aria-hidden="true">
          <span style={{ width: `${Math.min(100, load.ratio * 100)}%` }} />
        </div>
      )}
      {levelText[level] && <p className="insp__warn">{levelText[level]}</p>}
      <p className="insp__note">{load.fed.length > 0 ? t.feeds({ list: load.fed.map((d) => `${d.name} (${watts(d, fmt)})`).join(', ') }) : t.nothing}</p>
    </section>
  )
}
