import { useRef, useState, type KeyboardEvent } from 'react'
import { TEMPLATES } from '../catalog/templates'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../catalog/categories'
import { BUILTIN_ICON_NAMES } from '../catalog/iconNames'
import { CONNECTOR_LABELS, POE_CHOICE_LABELS } from '../catalog/labels'
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
import type { Category, Connector, DeviceTemplate } from '../model/types'
import { importIconFile } from '../icons/importIcon'
import { DeviceIcon } from '../icons/Icon'
import { libraryStore, libraryTemplate } from '../store/libraryStore'
import { projectStore } from '../store/projectStore'
import { uiStore, useUiStore } from '../store/uiStore'
import { ipcErrorMessage } from '../app/ipcError'
import './componentEditor.css'

const CONNECTORS = ConnectorSchema.options
const POE_CHOICES = Object.keys(POE_CHOICE_LABELS) as PoeChoice[]
// Pas de switch perso : les switchs passent par le configurateur.
const BASES = TEMPLATES.filter((t) => !t.switch)

export function ComponentEditor() {
  const state = useUiStore((s) => s.componentEditor)
  if (!state) return null
  const editing = state.mode === 'edit' ? (libraryTemplate(state.templateId) ?? null) : null
  return <EditorForm key={state.mode === 'edit' ? state.templateId : 'new'} editing={editing} />
}

function EditorForm({ editing }: { editing: DeviceTemplate | null }) {
  const [draft, setDraft] = useState<TemplateDraft>(() => (editing ? draftFrom(editing) : blankDraft()))
  const [base, setBase] = useState('')
  const [batchCount, setBatchCount] = useState('1')
  const [batchConnector, setBatchConnector] = useState<Connector>('rj45')
  const [iconError, setIconError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const errors = validateDraft(draft)
  const title = editing ? 'Modifier la composante' : 'Nouvelle composante'

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
      const from = t ? draftFrom(t) : blankDraft()
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
    const res = importIconFile(file.name, new Uint8Array(await file.arrayBuffer()))
    if (res.ok) {
      patch({ icon: res.icon })
      setIconError(null)
    } else setIconError(res.error)
  }
  const save = async (): Promise<void> => {
    if (hasErrors(errors) || saving) return
    setSaving(true)
    // Toujours un nouvel identifiant : les projets qui utilisent l'ancienne version la gardent.
    const template = templateFromDraft(draft, newCustomId())
    try {
      if (editing) await libraryStore.getState().replace(editing.id, template)
      else await libraryStore.getState().save(template)
      close()
    } catch (e) {
      projectStore.getState().showToast(`Enregistrement de la composante impossible : ${ipcErrorMessage(e)}`)
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
            <label className="ce__label" htmlFor="ce-base">Ressemble à…</label>
            <select id="ce-base" value={base} onChange={(e) => chooseBase(e.target.value)}>
              <option value="">Vide</option>
              {BASES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="ce__row">
          <div className="ce__field ce__grow">
            <label className="ce__label" htmlFor="ce-name">Nom</label>
            <input id="ce-name" autoFocus value={draft.name} maxLength={80} onChange={(e) => patch({ name: e.target.value })} />
            {errors.name && <p className="ce__error">{errors.name}</p>}
          </div>
          <div className="ce__field ce__code">
            <label className="ce__label" htmlFor="ce-code">Code</label>
            <input id="ce-code" value={draft.code} onChange={(e) => patch({ code: normalizeCode(e.target.value) })} />
            {errors.code && <p className="ce__error">{errors.code}</p>}
          </div>
        </div>

        <div className="ce__row">
          <div className="ce__field">
            <label className="ce__label" htmlFor="ce-category">Catégorie</label>
            <select id="ce-category" value={draft.category} onChange={(e) => patch({ category: e.target.value as Category })}>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="ce__field ce__grow">
            <label className="ce__label" htmlFor="ce-vendor">Fabricant</label>
            <input id="ce-vendor" value={draft.vendor} onChange={(e) => patch({ vendor: e.target.value })} />
          </div>
          <div className="ce__field ce__grow">
            <label className="ce__label" htmlFor="ce-model">Modèle</label>
            <input id="ce-model" value={draft.model} onChange={(e) => patch({ model: e.target.value })} />
          </div>
        </div>

        <fieldset className="ce__group">
          <legend className="ce__label">Icône</legend>
          <div className="ce__icons" role="radiogroup" aria-label="Icônes maison">
            {BUILTIN_ICON_NAMES.map((name) => {
              const on = draft.icon.kind === 'builtin' && draft.icon.name === name
              return (
                <button key={name} type="button" role="radio" aria-checked={on} aria-label={`Icône ${name}`} className={`ce__icon${on ? ' is-on' : ''}`} onClick={() => patch({ icon: { kind: 'builtin', name } })}>
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
              Importer…
            </button>
            <span className="ce__hint">SVG ou PNG, 256 Ko au plus</span>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept=".svg,.png,image/svg+xml,image/png"
              aria-label="Fichier d’icône"
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
            Ports ({draft.ports.length} / {MAX_PORTS})
          </legend>
          {draft.ports.length > 0 && (
            <table className="ce__ports">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Connecteur</th>
                  <th>PoE</th>
                  <th>
                    <span className="ce__sr">Retirer</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {draft.ports.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <input aria-label={`Nom du port ${i + 1}`} value={p.label} onChange={(e) => setPort(i, { label: e.target.value })} />
                    </td>
                    <td>
                      <select aria-label={`Connecteur du port ${i + 1}`} value={p.connector} onChange={(e) => setPort(i, { connector: e.target.value as Connector })}>
                        {CONNECTORS.map((c) => (
                          <option key={c} value={c}>
                            {CONNECTOR_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select aria-label={`PoE du port ${i + 1}`} value={p.poe} disabled={!poeAllowed(p.connector)} onChange={(e) => setPort(i, { poe: e.target.value as PoeChoice })}>
                        {POE_CHOICES.map((c) => (
                          <option key={c} value={c}>
                            {POE_CHOICE_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button type="button" className="ce__remove" aria-label={`Retirer le port ${i + 1}`} onClick={() => setDraft((d) => ({ ...d, ports: d.ports.filter((_, j) => j !== i) }))}>
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="ce__batch">
            <input type="number" min={1} max={MAX_PORTS} aria-label="Nombre de ports" value={batchCount} onChange={(e) => setBatchCount(e.target.value)} onKeyDown={onBatchKey} />
            <span aria-hidden="true">×</span>
            <select aria-label="Connecteur à ajouter" value={batchConnector} onChange={(e) => setBatchConnector(e.target.value as Connector)}>
              {CONNECTORS.map((c) => (
                <option key={c} value={c}>
                  {CONNECTOR_LABELS[c]}
                </option>
              ))}
            </select>
            <button type="button" className="btn" disabled={draft.ports.length >= MAX_PORTS} onClick={addBatch}>
              Ajouter
            </button>
          </div>
          {errors.ports && <p className="ce__error">{errors.ports}</p>}
        </fieldset>

        <div className="ce__actions">
          <button type="button" className="btn" onClick={close}>
            Annuler
          </button>
          <button type="submit" className="btn btn--primary" disabled={hasErrors(errors) || saving}>
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  )
}
