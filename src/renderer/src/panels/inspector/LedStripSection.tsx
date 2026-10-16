// src/renderer/src/panels/inspector/LedStripSection.tsx
import type { Device, LedStrip, LedStripType, Project } from '../../model/types'
import { LedStripTypeSchema } from '../../model/schema'
import { LED_STRIP_TYPES, LED_VOLTAGES, stripPixels, stripPower, stripWithType } from '../../model/led'
import { issueTexts, overlapsIn, patchIndex, sourceLabel } from '../../model/dmx'
import { parseDecimalField, parseIntField } from '../../model/fields'
import { useT } from '../../i18n/useT'
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
export function LedStripSection({ device, project }: { device: Device; project: Project }) {
  const { m, fmt } = useT()
  const t = m.inspector.ledStrip
  const index = patchIndex(project) // mémorisé par projet
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
      <h3 className="insp__title">{t.title}</h3>
      <label className="field">
        <span className="field__label">{t.type}</span>
        <select className="input" aria-label={t.typeAria} value={strip.type} onChange={(e) => save(stripWithType(strip, e.target.value as LedStripType))}>
          {LedStripTypeSchema.options.map((t) => (
            <option key={t} value={t}>
              {LED_STRIP_TYPES[t].label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field__label">{t.voltage}</span>
        <select className="input" aria-label={t.voltageAria} value={String(strip.volts)} onChange={(e) => save({ ...strip, volts: Number(e.target.value) })}>
          {voltages.map((v) => (
            <option key={v} value={String(v)}>{fmt.qty(v, 'V')}</option>
          ))}
        </select>
      </label>
      <div className="field">
        <span className="field__label">{t.power}</span>
        <div className="patch__row">
          <CommitInput
            className="input"
            aria-label={t.powerAria}
            inputMode="decimal"
            value={decimal(strip.wPerM)}
            onCommit={(v) => {
              const n = parseDecimalField(v)
              if (n === undefined) s().showToast(t.powerToast)
              else if (n !== null) save({ ...strip, wPerM: n })
            }}
          />
          <span className="patch__range">W/m</span>
        </div>
      </div>
      <div className="field">
        <span className="field__label">{t.length}</span>
        <div className="patch__row">
          <CommitInput
            className="input"
            aria-label={t.lengthAria}
            inputMode="decimal"
            placeholder="—"
            value={decimal(strip.lengthM)}
            onCommit={(v) => {
              const n = parseDecimalField(v, true)
              if (n === undefined) s().showToast(t.lengthToast)
              else save({ ...strip, lengthM: n ?? undefined })
            }}
          />
          <span className="patch__range">m</span>
        </div>
      </div>
      <p className="insp__note">{power ? `→ ${fmt.qty(power.watts, 'W')} · ${fmt.qty(power.amps, 'A', 1)}` : t.lengthTbd}</p>
      {info.pixel && (
        <>
          <div className="field">
            <span className="field__label">{t.pixels}</span>
            <div className="patch__row">
              <CommitInput
                className="input"
                aria-label={t.pixelsAria}
                inputMode="numeric"
                placeholder="—"
                value={strip.pxPerM !== undefined ? String(strip.pxPerM) : ''}
                onCommit={(v) => {
                  const n = parseIntField(v, 1, 10000)
                  if (n === undefined) s().showToast(t.pixelsToast)
                  else save({ ...strip, pxPerM: n ?? undefined })
                }}
              />
              <span className="patch__range">px/m</span>
            </div>
          </div>
          {px && <p className="insp__note">{t.pixelsSummary({ pixels: fmt.num(px.pixels), channels: fmt.num(px.channels), universes: px.universes })}</p>}
          {(() => {
            const sp = index.strips.get(device.id)
            if (!sp || sp.spans.length === 0) return null
            const first = sp.spans[0]!.universe
            const last = sp.spans.at(-1)!.universe
            // Appareils patchés dans un univers de la bande : même repère que le bloc Patch DMX.
            const warnings = [...new Set(sp.spans.flatMap((span) => issueTexts({ overlaps: overlapsIn(index, span.universe, 1, span.channels, device.id), overflow: false })))]
            return (
              <>
                <p className="insp__note">{t.universes({ range: first === last ? String(first) : `${first}–${last}`, via: sourceLabel(project, { kind: 'port', ref: sp.source }) })}</p>
                {warnings.map((w) => (
                  <p key={w} className="insp__warn">
                    {w}
                  </p>
                ))}
              </>
            )
          })()}
        </>
      )}
    </section>
  )
}
