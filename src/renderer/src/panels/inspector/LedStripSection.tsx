// src/renderer/src/panels/inspector/LedStripSection.tsx
import type { Device, LedStrip, LedStripType, Project } from '../../model/types'
import { LedStripTypeSchema } from '../../model/schema'
import { LED_STRIP_TYPES, LED_VOLTAGES, stripPixels, stripPower, stripWithType } from '../../model/led'
import { formatFr, parseDecimalField, parseIntField } from '../../model/fields'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'

const decimal = (n: number | undefined): string => (n === undefined ? '' : String(n).replace('.', ','))

function compactStrip(s: LedStrip): LedStrip {
  return {
    type: s.type,
    volts: s.volts,
    wPerM: s.wPerM,
    ...(s.lengthM !== undefined ? { lengthM: s.lengthM } : {}),
    ...(s.pxPerM !== undefined ? { pxPerM: s.pxPerM } : {})
  }
}

// Bande LED (spec § 5.3) : le type préremplit, la puissance et les pixels se calculent.
export function LedStripSection({ device, project: _project }: { device: Device; project: Project }) {
  const strip = device.ledStrip
  if (!strip) return null
  const s = projectStore.getState
  const info = LED_STRIP_TYPES[strip.type]
  const power = stripPower(strip)
  const px = stripPixels(strip)
  const save = (next: LedStrip): void => s().updateDevice(device.id, { ledStrip: compactStrip(next) })
  const voltages = LED_VOLTAGES.includes(strip.volts) ? LED_VOLTAGES : [...LED_VOLTAGES, strip.volts]
  return (
    <section className="insp__section">
      <h3 className="insp__title">Bande LED</h3>
      <label className="field">
        <span className="field__label">Type</span>
        <select className="input" aria-label="Type de bande" value={strip.type} onChange={(e) => save(stripWithType(strip, e.target.value as LedStripType))}>
          {LedStripTypeSchema.options.map((t) => (
            <option key={t} value={t}>
              {LED_STRIP_TYPES[t].label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">Tension</span>
        <select className="input" aria-label="Tension de la bande" value={String(strip.volts)} onChange={(e) => save({ ...strip, volts: Number(e.target.value) })}>
          {voltages.map((v) => (
            <option key={v} value={String(v)}>{`${formatFr(v)} V`}</option>
          ))}
        </select>
      </label>
      <div className="field">
        <span className="field__label">Puissance</span>
        <div className="patch__row">
          <CommitInput
            className="input"
            aria-label="Puissance (W/m)"
            inputMode="decimal"
            value={decimal(strip.wPerM)}
            onCommit={(v) => {
              const n = parseDecimalField(v)
              if (n === undefined) s().showToast('Puissance de la bande : un nombre positif ou nul, en W/m.')
              else if (n !== null) save({ ...strip, wPerM: n })
            }}
          />
          <span className="patch__range">W/m</span>
        </div>
      </div>
      <div className="field">
        <span className="field__label">Longueur</span>
        <div className="patch__row">
          <CommitInput
            className="input"
            aria-label="Longueur (m)"
            inputMode="decimal"
            placeholder="—"
            value={decimal(strip.lengthM)}
            onCommit={(v) => {
              const n = parseDecimalField(v, true)
              if (n === undefined) s().showToast('Longueur : un nombre plus grand que 0, en mètres.')
              else save({ ...strip, lengthM: n ?? undefined })
            }}
          />
          <span className="patch__range">m</span>
        </div>
      </div>
      <p className="insp__note">{power ? `→ ${formatFr(power.watts)} W · ${formatFr(power.amps, 1)} A` : '→ longueur à définir'}</p>
      {info.pixel && (
        <>
          <div className="field">
            <span className="field__label">Pixels</span>
            <div className="patch__row">
              <CommitInput
                className="input"
                aria-label="Pixels (px/m)"
                inputMode="numeric"
                placeholder="—"
                value={strip.pxPerM !== undefined ? String(strip.pxPerM) : ''}
                onCommit={(v) => {
                  const n = parseIntField(v, 1, 10000)
                  if (n === undefined) s().showToast('Pixels : un nombre entier de 1 à 10000 par mètre.')
                  else save({ ...strip, pxPerM: n ?? undefined })
                }}
              />
              <span className="patch__range">px/m</span>
            </div>
          </div>
          {px && <p className="insp__note">{`→ ${formatFr(px.pixels)} px · ${formatFr(px.channels)} ch · ${px.universes} univers`}</p>}
        </>
      )}
    </section>
  )
}
