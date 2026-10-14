// src/renderer/src/panels/Palette.tsx
import { useMemo, useState } from 'react'
import type { DeviceTemplate } from '../model/types'
import { TEMPLATES } from '../catalog/templates'
import { searchTemplates } from '../catalog/search'
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../catalog/categories'
import { uiStore, useUiStore } from '../store/uiStore'
import { DeviceIcon, Icon } from '../icons/Icon'
import { CATEGORY_ICON } from '../icons/glyphs'
import './panels.css'

export const TEMPLATE_MIME = 'application/x-avwan-template'

const GROUPS = CATEGORY_ORDER.map((category) => ({ category, items: TEMPLATES.filter((t) => t.category === category) }))

export function PaletteItem({ template, pending }: { template: DeviceTemplate; pending: boolean }) {
  return (
    <li>
      <button
        type="button"
        draggable
        data-testid={`palette-${template.id}`}
        className={`palette__item${pending ? ' is-pending' : ''}`}
        title="Glisser sur le canvas, ou cliquer puis cliquer sur le canvas"
        onDragStart={(e) => {
          e.dataTransfer.setData(TEMPLATE_MIME, template.id)
          e.dataTransfer.effectAllowed = 'copy'
        }}
        onClick={() => uiStore.getState().setPendingTemplate(pending ? null : template.id)}
      >
        <DeviceIcon icon={template.icon} size={18} />
        <span className="palette__name">{template.name}</span>
        <span className="palette__code">{template.code}</span>
      </button>
    </li>
  )
}

export function Palette() {
  const pending = useUiStore((s) => s.pendingTemplateId)
  const [filter, setFilter] = useState('')
  const results = useMemo(() => (filter.trim() ? searchTemplates(filter) : null), [filter])
  return (
    <nav className="palette" aria-label="Palette d’appareils">
      <div className="palette__search">
        <Icon name="search" size={14} />
        <input
          className="palette__filter"
          type="search"
          aria-label="Filtrer les appareils"
          placeholder="Filtrer…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setFilter('')
          }}
        />
      </div>
      {results ? (
        results.length > 0 ? (
          <ul aria-label="Résultats du filtre">
            {results.map((t) => (
              <PaletteItem key={t.id} template={t} pending={pending === t.id} />
            ))}
          </ul>
        ) : (
          <p className="palette__empty">Aucun appareil ne correspond.</p>
        )
      ) : (
        GROUPS.map((g) => (
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
        ))
      )}
    </nav>
  )
}
