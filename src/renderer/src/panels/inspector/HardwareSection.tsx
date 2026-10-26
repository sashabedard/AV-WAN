// src/renderer/src/panels/inspector/HardwareSection.tsx
import type { Device, Hardware, Project } from '../../model/types'
import { isRackDevice } from '../../model/rules'
import { canHostVms } from '../../model/vms'
import { decimalText, parseDecimalField } from '../../model/fields'
import { projectStore } from '../../store/projectStore'
import { CommitInput } from '../CommitInput'
import { useT } from '../../i18n/useT'

// Attributs matériels (spec cartes-ip-vms § 4.7) : ouverte par défaut pour un ordinateur, absente pour un appareil de baie.
export function HardwareSection({ device, project }: { device: Device; project: Project }) {
  const { m, lang } = useT()
  const t = m.inspector.hardware
  if (isRackDevice(device)) return null
  const s = projectStore.getState
  const specs = device.specs ?? {}
  const save = (patch: Partial<Hardware>): void => {
    const next: Hardware = { ...specs, ...patch }
    for (const k of Object.keys(next) as Array<keyof Hardware>) if (next[k] === undefined) delete next[k]
    s().updateDevice(device.id, { specs: Object.keys(next).length > 0 ? next : undefined })
  }
  const text = (key: 'os' | 'cpu' | 'storage' | 'gpu', label: string) => (
    <label className="field">
      <span className="field__label">{label}</span>
      <CommitInput className="input" aria-label={label} value={specs[key] ?? ''} onCommit={(v) => save({ [key]: v.trim() || undefined })} />
    </label>
  )
  return (
    <details className="field hw" open={canHostVms(project, device)}>
      <summary className="chan__sum">{t.title}</summary>
      {text('os', t.os)}
      {text('cpu', t.cpu)}
      <label className="field">
        <span className="field__label">{t.ram}</span>
        <CommitInput
          className="input"
          aria-label={t.ram}
          inputMode="decimal"
          value={specs.ramGb !== undefined ? decimalText(specs.ramGb, lang) : ''}
          onCommit={(v) => {
            const n = parseDecimalField(v, true, lang)
            if (n === undefined) s().showToast(m.inspector.vm.numberToast)
            else save({ ramGb: n ?? undefined })
          }}
        />
      </label>
      {text('storage', t.storage)}
      {text('gpu', t.gpu)}
    </details>
  )
}
