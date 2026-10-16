import { useRef, useState, type KeyboardEvent } from 'react'
import { TEMPLATES } from '../catalog/templates'
import { categoryLabel, CATEGORY_ORDER } from '../catalog/categories'
import { BUILTIN_ICON_NAMES } from '../catalog/iconNames'
import { POE_CHOICE_IDS, connectorLabel, poeChoiceLabel } from '../catalog/labels'
import { displayName } from '../catalog/templateText'
import { ConnectorSchema } from '../model/schema'
import {
  MAX_PORTS,
  addPortBatch,
  blankDraft,
  draftFrom,
  hasErrors,
  newCustomId,
  normalizeCode,
  poeAllowed,
  templateFromDraft,
  validateDraft,
  type PoeChoice,
  type PortDraft,
  type TemplateDraft
} from '../model/customTemplate'
import type { Category, Connector, StoredTemplate } from '../model/types'
import { importIconFile } from '../icons/importIcon'
import { DeviceIcon } from '../icons/Icon'
import { libraryStore, libraryTemplate } from '../store/libraryStore'
import { projectStore } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { ipcErrorMessage } from '../app/ipcError'
import { useT } from '../i18n/useT'
import './componentEditor.css'

const CONNECTORS = ConnectorSchema.options
const POE_CHOICES = POE_CHOICE_IDS
// Pas de switch perso : les switchs passent par le configurateur.
const BASES = TEMPLATES.filter((t) => !t.switch)

export function ComponentEditor() {
  const state = useUiStore((s) => s.componentEditor)
  if (!state) return null
  const editing = state.mode === 'edit' ? (libraryTemplate(state.templateId) ?? null) : null
  return <EditorForm key={state.mode === 'edit' ? state.templateId : 'new'} editing={editing} />
}

function EditorForm({ editing }: { editing: StoredTemplate | null }) {
  const { m, lang } = useT()
  const t = m.componentEditor
  const [draft, setDraft] = useState<TemplateDraft>(() => (editing ? draftFrom(editing, lang) : blankDraft()))
  const [base, setBase] = useState('')
  const [batchCount, setBatchCount] = useState('1')
  const [batchConnector, setBatchConnector] = useState<Connector>('rj45')
  const [iconError, setIconError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const errors = validateDraft(draft, t.errors, lang)
  const title = editing ? t.titleEdit : t.titleNew

  const close = (): void => uiStore.getState().openComponentEditor(null)
  const patch = (p: Partial<TemplateDraft>): void => setDraft((d) => ({ ...d, ...p }))
  const setPort = (index: number, p: Partial<PortDraft>): void =>
    setDraft((d) => ({
      ...d,
      ports: d.ports.map((port, i) => {
        if (i !== index) return port
        const next = { ...port, ...p }
        return poeAllowed(next.connector) ? next : { ...next, poe: 'none' }
      })
    }))
  const chooseBase = (id: string): void => {
    setBase(id)
    const t = BASES.find((x) => x.id === id)
    setDraft((d) => {
      const from = t ? draftFrom(t, lang) : blankDraft()
      return { ...from, name: d.name, code: d.code || from.code }
    })
  }
  const addBatch = (): void => {
    const n = Math.max(1, Math.min(MAX_PORTS, Math.floor(Number(batchCount)) || 1))
    patch({ ports: addPortBatch(draft.ports, batchConnector, n) })
  }
  // Entrée ajoute les ports (comme « Ajouter ») au lieu de soumettre le formulaire.
  const onBatchKey = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    addBatch()
  }
  const importIcon = async (file: File): Promise<void> => {
    const res = importIconFile(file.name, new Uint8Array(await file.arrayBuffer()), t.iconErrors)
    if (res.ok) {
      patch({ icon: res.icon })
      setIconError(null)
    } else setIconError(res.error)
  }
  const save = async (): Promise<void> => {
    if (hasErrors(errors) || saving) return
    setSaving(true)
    // Toujours un nouvel identifiant : les projets qui utilisent l'ancienne version la gardent.
    const template = templateFromDraft(draft, newCustomId(), lang)
    try {
      if (editing) await libraryStore.getState().replace(editing.id, template)
      else await libraryStore.getState().save(template)
      close()
    } catch (e) {
      projectStore.getState().showToast(t.saveFailed({ detail: ipcErrorMessage(e) }))
      setSaving(false)
    }
  }

  return (
    <div
      className="ce"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation()
          close()
        }
      }}
    >
      <form
        className="ce__card"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <h2 className="ce__title">{title}</h2>

        {!editing && (
          <div className="ce__field">
            <label className="ce__label" htmlFor="ce-base">{t.similarTo}</label>
            <select id="ce-base" value={base} onChange={(e) => chooseBase(e.target.value)}>
              <option value="">{t.blank}</option>
              {BASES.map((t) => (
                <option key={t.id} value={t.id}>
                  {displayName(t, lang)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ce__row">
          <div className="ce__field ce__grow">
            <label className="ce__label" htmlFor="ce-name">{t.name}</label>
            <input id="ce-name" autoFocus value={draft.name} maxLength={80} onChange={(e) => patch({ name: e.target.value })} />
            {errors.name && <p className="ce__error">{errors.name}</p>}
          </div>
          <div className="ce__field ce__code">
            <label className="ce__label" htmlFor="ce-code">{t.code}</label>
            <input id="ce-code" value={draft.code} onChange={(e) => patch({ code: normalizeCode(e.target.value) })} />
            {errors.code && <p className="ce__error">{errors.code}</p>}
          </div>
        </div>

        <div className="ce__row">
          <div className="ce__field">
            <label className="ce__label" htmlFor="ce-category">{t.category}</label>
            <select id="ce-category" value={draft.category} onChange={(e) => patch({ category: e.target.value as Category })}>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel(c, m)}
                </option>
              ))}
            </select>
          </div>
          <div className="ce__field ce__grow">
            <label className="ce__label" htmlFor="ce-vendor">{t.vendor}</label>
            <input id="ce-vendor" value={draft.vendor} onChange={(e) => patch({ vendor: e.target.value })} />
          </div>
          <div className="ce__field ce__grow">
            <label className="ce__label" htmlFor="ce-model">{t.model}</label>
            <input id="ce-model" value={draft.model} onChange={(e) => patch({ model: e.target.value })} />
          </div>
        </div>

        <div className="ce__row">
          <label className="ce__check">
            <input type="checkbox" checked={draft.patchable} onChange={(e) => patch({ patchable: e.target.checked })} />
            {t.patchable}
          </label>
          {draft.patchable && (
            <div className="ce__field ce__code">
              <label className="ce__label" htmlFor="ce-footprint">{t.channels}</label>
              <input id="ce-footprint" inputMode="numeric" value={draft.footprint} onChange={(e) => patch({ footprint: e.target.value })} />
              {errors.dmx && <p className="ce__error">{errors.dmx}</p>}
            </div>
          )}
          <div className="ce__field ce__code">
            <label className="ce__label" htmlFor="ce-power">{t.power}</label>
            <input id="ce-power" inputMode="decimal" value={draft.powerW} onChange={(e) => patch({ powerW: e.target.value })} />
            {errors.power && <p className="ce__error">{errors.power}</p>}
          </div>
        </div>

        <fieldset className="ce__group">
          <legend className="ce__label">{t.icon}</legend>
          <div className="ce__icons" role="radiogroup" aria-label={t.builtinIcons}>
            {BUILTIN_ICON_NAMES.map((name) => {
              const on = draft.icon.kind === 'builtin' && draft.icon.name === name
              return (
                <button key={name} type="button" role="radio" aria-checked={on} aria-label={t.iconNamed({ name })} className={`ce__icon${on ? ' is-on' : ''}`} onClick={() => patch({ icon: { kind: 'builtin', name } })}>
                  <DeviceIcon icon={{ kind: 'builtin', name }} size={18} />
                </button>
              )
            })}
          </div>
          <div className="ce__import">
            <span className="ce__preview">
              <DeviceIcon icon={draft.icon} size={28} />
            </span>
            <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
              {t.import}
            </button>
            <span className="ce__hint">{t.importHint}</span>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept=".svg,.png,image/svg+xml,image/png"
              aria-label={t.iconFile}
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (file) void importIcon(file)
              }}
            />
          </div>
          {iconError && (
            <p className="ce__error" role="alert">
              {iconError}
            </p>
          )}
        </fieldset>

        <fieldset className="ce__group">
          <legend className="ce__label">
            {t.ports({ n: draft.ports.length, max: MAX_PORTS })}
          </legend>
          {draft.ports.length > 0 && (
            <table className="ce__ports">
              <thead>
                <tr>
                  <th>{t.colName}</th>
                  <th>{t.colConnector}</th>
                  <th>{t.colPoe}</th>
                  <th>
                    <span className="ce__sr">{t.colRemove}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {draft.ports.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <input aria-label={t.portName({ n: i + 1 })} value={p.label} onChange={(e) => setPort(i, { label: e.target.value })} />
                    </td>
                    <td>
                      <select aria-label={t.portConnector({ n: i + 1 })} value={p.connector} onChange={(e) => setPort(i, { connector: e.target.value as Connector })}>
                        {CONNECTORS.map((c) => (
                          <option key={c} value={c}>
                            {connectorLabel(c, m)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select aria-label={t.portPoe({ n: i + 1 })} value={p.poe} disabled={!poeAllowed(p.connector)} onChange={(e) => setPort(i, { poe: e.target.value as PoeChoice })}>
                        {POE_CHOICES.map((c) => (
                          <option key={c} value={c}>
                            {poeChoiceLabel(c, m)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button type="button" className="ce__remove" aria-label={t.removePort({ n: i + 1 })} onClick={() => setDraft((d) => ({ ...d, ports: d.ports.filter((_, j) => j !== i) }))}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="ce__batch">
            <input type="number" min={1} max={MAX_PORTS} aria-label={t.batchCount} value={batchCount} onChange={(e) => setBatchCount(e.target.value)} onKeyDown={onBatchKey} />
            <span aria-hidden="true">×</span>
            <select aria-label={t.batchConnector} value={batchConnector} onChange={(e) => setBatchConnector(e.target.value as Connector)}>
              {CONNECTORS.map((c) => (
                <option key={c} value={c}>
                  {connectorLabel(c, m)}
                </option>
              ))}
            </select>
            <button type="button" className="btn" disabled={draft.ports.length >= MAX_PORTS} onClick={addBatch}>
              {t.add}
            </button>
          </div>
          {errors.ports && <p className="ce__error">{errors.ports}</p>}
        </fieldset>

        <div className="ce__actions">
          <button type="button" className="btn" onClick={close}>
            {t.cancel}
          </button>
          <button type="submit" className="btn btn--primary" disabled={hasErrors(errors) || saving}>
            {t.save}
          </button>
        </div>
      </form>
    </div>
  )
}
