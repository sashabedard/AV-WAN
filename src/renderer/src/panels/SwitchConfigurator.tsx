import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { SwitchSpec } from '../model/types'
import { POE_CHOICES, SWITCH_PORT_COUNTS, defaultPoeBudget, switchSummary } from '../catalog/switch'
import { Segmented } from './Segmented'
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
const SFP_OPTIONS = [0, 2, 4].map((n) => ({ value: String(n), label: String(n) }))

export function SwitchConfigurator({ initial, submitLabel, onSubmit, onCancel }: SwitchConfiguratorProps) {
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
      aria-label="Configurer le switch"
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return
        e.stopPropagation()
        onCancel()
      }}
    >
      <h2 className="cfg__title">Switch</h2>
      <div className="field">
        <span className="field__label">Ports</span>
        <Segmented
          ariaLabel="Nombre de ports"
          options={PORT_OPTIONS}
          value={String(spec.portCount)}
          onChange={(v) => update({ portCount: Number(v) as SwitchSpec['portCount'] })}
        />
      </div>
      <div className="field">
        <span className="field__label">PoE</span>
        <Segmented ariaLabel="PoE" options={POE_CHOICES} value={spec.poe} onChange={(v) => update({ poe: v })} />
      </div>
      {spec.poe !== 'none' && (
        <label className="field">
          <span className="field__label">Budget PoE (W)</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            aria-label="Budget PoE en watts"
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
          ariaLabel="Cages SFP+"
          options={SFP_OPTIONS}
          value={String(spec.sfpPlus)}
          onChange={(v) => update({ sfpPlus: Number(v) as SwitchSpec['sfpPlus'] })}
        />
      </div>
      <label className="field--inline">
        <input type="checkbox" checked={spec.managed} onChange={(e) => update({ managed: e.target.checked })} /> Géré (VLAN, IGMP)
      </label>
      <p className="cfg__summary" data-testid="cfg-summary">
        {switchSummary(spec)}
      </p>
      <div className="actions">
        <button type="button" className="btn" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="btn btn--primary">
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
