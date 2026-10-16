import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { SwitchSpec } from '../model/types'
import { SWITCH_PORT_COUNTS, defaultPoeBudget, poeChoices, switchSummary } from '../catalog/switch'
import { Segmented } from './Segmented'
import { useT } from '../i18n/useT'
import './panels.css'

export function withBudget(spec: SwitchSpec, touched: boolean): SwitchSpec {
  if (spec.poe === 'none') {
    const { poeBudgetW: _dropped, ...rest } = spec
    return rest
  }
  if (touched && spec.poeBudgetW !== undefined) return spec
  return { ...spec, poeBudgetW: defaultPoeBudget(spec.portCount, spec.poe) }
}

export interface SwitchConfiguratorProps {
  initial: SwitchSpec
  submitLabel: string
  onSubmit: (spec: SwitchSpec) => void
  onCancel: () => void
}

const PORT_OPTIONS = SWITCH_PORT_COUNTS.map((n) => ({ value: String(n), label: String(n) }))
const SFP_OPTIONS = [0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))

export function SwitchConfigurator({ initial, submitLabel, onSubmit, onCancel }: SwitchConfiguratorProps) {
  const { m } = useT()
  const [touched, setTouched] = useState(
    initial.poeBudgetW !== undefined && initial.poeBudgetW !== defaultPoeBudget(initial.portCount, initial.poe)
  )
  const [spec, setSpec] = useState<SwitchSpec>(() => withBudget(initial, touched))
  const formRef = useRef<HTMLFormElement>(null)
  // Focus sur la valeur choisie : Échap et les flèches fonctionnent sans clic préalable.
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus()
  }, [])
  const update = (patch: Partial<SwitchSpec>): void => setSpec((s) => withBudget({ ...s, ...patch }, touched))
  const submit = (e: FormEvent): void => {
    e.preventDefault()
    onSubmit(spec)
  }
  return (
    <form
      ref={formRef}
      className="cfg"
      role="dialog"
      aria-label={m.switchConfigurator.dialog}
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.stopPropagation()
        onCancel()
      }}
    >
      <h2 className="cfg__title">{m.switchConfigurator.title}</h2>
      <div className="field">
        <span className="field__label">{m.switchConfigurator.ports}</span>
        <Segmented
          ariaLabel={m.switchConfigurator.portCount}
          options={PORT_OPTIONS}
          value={String(spec.portCount)}
          onChange={(v) => update({ portCount: Number(v) as SwitchSpec['portCount'] })}
        />
      </div>
      <div className="field">
        <span className="field__label">{m.switchConfigurator.poe}</span>
        <Segmented ariaLabel={m.switchConfigurator.poe} options={poeChoices(m)} value={spec.poe} onChange={(v) => update({ poe: v })} />
      </div>
      {spec.poe !== 'none' && (
        <label className="field">
          <span className="field__label">{m.switchConfigurator.poeBudget}</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            aria-label={m.switchConfigurator.poeBudgetLabel}
            value={spec.poeBudgetW ?? ''}
            onChange={(e) => {
              setTouched(true)
              const n = e.target.valueAsNumber
              setSpec((s) => {
                const { poeBudgetW: _previous, ...rest } = s
                return Number.isFinite(n) ? { ...rest, poeBudgetW: n } : rest
              })
            }}
          />
        </label>
      )}
      <div className="field">
        <span className="field__label">SFP+</span>
        <Segmented
          ariaLabel={m.switchConfigurator.sfpCages}
          options={SFP_OPTIONS}
          value={String(spec.sfpPlus)}
          onChange={(v) => update({ sfpPlus: Number(v) })}
        />
      </div>
      <label className="field--inline">
        <input type="checkbox" checked={spec.managed} onChange={(e) => update({ managed: e.target.checked })} /> {m.switchConfigurator.managed}
      </label>
      <p className="cfg__summary" data-testid="cfg-summary">
        {switchSummary(spec, m)}
      </p>
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>
          {m.switchConfigurator.cancel}
        </button>
        <button type="submit" className="btn btn--primary">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
