// src/renderer/src/panels/Palette.tsx
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DeviceTemplate } from '../model/types'
import { TEMPLATES } from '../catalog/templates'
import { searchTemplates } from '../catalog/search'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../catalog/categories'
import { uiStore, useUiStore } from '../store/uiStore'
import { DeviceIcon, Icon } from '../icons/Icon'
import { CATEGORY_ICON } from '../icons/glyphs'
import { duplicateTemplate } from '../model/customTemplate'
import { libraryStore } from '../store/libraryStore'
import { projectStore } from '../store/projectStore'
import { ipcErrorMessage } from '../app/ipcError'
import { useT } from '../i18n/useT'
import { useDismissOnOutside } from './useDismiss'
import { usePlaceableTemplates } from './usePlaceableTemplates'
import { TruncTip, useTruncTip } from './TruncTip'
import './panels.css'

export const TEMPLATE_MIME = 'application/x-avwan-template'

const GROUPS = CATEGORY_ORDER.map((category) => ({ category, items: TEMPLATES.filter((t) => t.category === category) }))

export function PaletteItem({ template, pending, actions }: { template: DeviceTemplate; pending: boolean; actions?: ReactNode }) {
  const { m } = useT()
  const nameRef = useRef<HTMLSpanElement>(null)
  const tip = useTruncTip(nameRef)
  return (
    <li className={actions ? 'palette__row' : undefined}>
      <button
        type="button"
        draggable
        data-testid={`palette-${template.id}`}
        className={`palette__item${pending ? ' is-pending' : ''}`}
        title={tip.cut ? undefined : m.palette.itemTitle}
        onPointerEnter={tip.show}
        onPointerLeave={tip.hide}
        onPointerDown={tip.hide}
        onDragStart={(e) => {
          tip.hide()
          e.dataTransfer.setData(TEMPLATE_MIME, template.id)
          e.dataTransfer.effectAllowed = 'copy'
        }}
        onClick={() => uiStore.getState().setPendingTemplate(pending ? null : template.id)}
      >
        <DeviceIcon icon={template.icon} size={18} />
        <span ref={nameRef} className="palette__name">
          {template.name}
        </span>
        <span className="palette__code">{template.code}</span>
      </button>
      <TruncTip at={tip.at} text={template.name} />
      {actions}
    </li>
  )
}

function report(task: Promise<unknown>, failure: (p: { detail: string }) => string): void {
  task.catch((e: unknown) => projectStore.getState().showToast(failure({ detail: ipcErrorMessage(e) })))
}

// Menu ⋯ d'une composante de ma bibliothèque.
function LibraryItemMenu({ template }: { template: DeviceTemplate }) {
  const { m } = useT()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const dismiss = useCallback(() => setOpen(false), [])
  useDismissOnOutside(ref, open, dismiss)
  const act = (fn: () => void): void => {
    setOpen(false)
    fn()
  }
  return (
    <div className="palette__menu" ref={ref}>
      <button type="button" className="palette__act" aria-label={m.palette.actionsFor({ name: template.name })} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        ⋯
      </button>
      {open && (
        <div
          className="palette__pop"
          role="menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
          }}
        >
          <button type="button" role="menuitem" onClick={() => act(() => uiStore.getState().openComponentEditor({ mode: 'edit', templateId: template.id }))}>
            {m.palette.edit}
          </button>
          <button type="button" role="menuitem" onClick={() => act(() => report(libraryStore.getState().save(duplicateTemplate(template, m.componentEditor.copySuffix)), m.palette.duplicateFailed))}>
            {m.palette.duplicate}
          </button>
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            onClick={() =>
              act(() => {
                if (window.confirm(m.palette.confirmRemove({ name: template.name }))) {
                  report(libraryStore.getState().remove(template.id), m.palette.removeFailed)
                }
              })
            }
          >
            {m.palette.remove}
          </button>
        </div>
      )}
    </div>
  )
}

export function Palette() {
  const { m } = useT()
  const pending = useUiStore((s) => s.pendingTemplateId)
  const pendingZone = useUiStore((s) => s.pendingZone)
  const [filter, setFilter] = useState('')
  const { library, projectOnly, all } = usePlaceableTemplates()
  const results = useMemo(() => (filter.trim() ? searchTemplates(filter, all) : null), [filter, all])
  return (
    <nav className="palette" aria-label={m.palette.navLabel}>
      <div className="palette__search">
        <Icon name="search" size={14} />
        <input
          className="palette__filter"
          type="search"
          aria-label={m.palette.filterLabel}
          placeholder={m.palette.filterPlaceholder}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setFilter('')
          }}
        />
      </div>
      <button
        type="button"
        className={`palette__tool${pendingZone ? ' is-pending' : ''}`}
        aria-pressed={pendingZone}
        title={m.palette.zoneToolTitle}
        onClick={() => uiStore.getState().setPendingZone(!pendingZone)}
      >
        <Icon name="zone" size={16} />
        {m.palette.zoneTool}
        <kbd className="palette__kbd">⌘G</kbd>
      </button>
      {results ? (
        results.length > 0 ? (
          <ul aria-label={m.palette.resultsLabel}>
            {results.map((t) => (
              <PaletteItem key={t.id} template={t} pending={pending === t.id} />
            ))}
          </ul>
        ) : (
          <p className="palette__empty">{m.palette.noMatch}</p>
        )
      ) : (
        <>
          <section aria-labelledby="palette-mine">
            <div className="palette__head">
              <h2 id="palette-mine" className="palette__cat">
                {m.palette.mine}
              </h2>
              <button type="button" className="palette__add" aria-label={m.palette.newComponent} title={m.palette.newComponent} onClick={() => uiStore.getState().openComponentEditor({ mode: 'new' })}>
                <Icon name="plus" size={14} />
              </button>
            </div>
            {library.length > 0 ? (
              <ul>
                {library.map((t) => (
                  <PaletteItem key={t.id} template={t} pending={pending === t.id} actions={<LibraryItemMenu template={t} />} />
                ))}
              </ul>
            ) : (
              <p className="palette__hint">{m.palette.mineHint}</p>
            )}
          </section>
          {projectOnly.length > 0 && (
            <section aria-labelledby="palette-project">
              <h2 id="palette-project" className="palette__cat">
                {m.palette.thisProject}
              </h2>
              <ul>
                {projectOnly.map((t) => (
                  <PaletteItem
                    key={t.id}
                    template={t}
                    pending={pending === t.id}
                    actions={
                      <button type="button" className="palette__act" aria-label={m.palette.addToLibrary({ name: t.name })} title={m.palette.addToLibraryTitle} onClick={() => report(libraryStore.getState().save(t), m.palette.addFailed)}>
                        <Icon name="plus" size={13} />
                      </button>
                    }
                  />
                ))}
              </ul>
            </section>
          )}
          {GROUPS.map((g) => (
            <section key={g.category}>
              <h2 className="palette__cat">
                <Icon name={CATEGORY_ICON[g.category]} size={14} />
                {CATEGORY_LABELS[g.category]}
              </h2>
              <ul>
                {g.items.map((t) => (
                  <PaletteItem key={t.id} template={t} pending={pending === t.id} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </nav>
  )
}
